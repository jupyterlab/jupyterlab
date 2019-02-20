
import collections
from itertools import chain
import json
import sqlite3
import re


sqlite3.enable_callback_tracebacks(True)

def serialized(transactions):
    for t in transactions:
        yield (
            t['id'],
            t['storeId'],
            json.dumps(t['patch']).encode('ascii'),
        )

def deserialized(rows):
    for r in rows:
        yield dict(
            id=r[0],
            storeId=r[1],
            patch=json.loads(r[2], encoding='ascii'),
            serial=r[3],
        )

def decode_serials(rows):
    for r in rows:
        yield r[0:2]


_table_name_re = re.compile(r'[a-zA-Z][a-zA-Z0-9_\-]*')

def validate_table_name(name):
    if _table_name_re.fullmatch(name) is None or name.startswith('checkpoints'):
        raise ValueError('Invalid table name %r' % (name,))


class DatastoreDB:

    def __init__(self, table_name, db_file=None):
        # first, validate table name
        validate_table_name(table_name)
        self._table_name = table_name
        self._transactions = []
        self._conn = sqlite3.connect(
            db_file or ':memory:',
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        self.checkpoint_id = 0
        self._setup_db()

    def close(self):
        """Clean up resources"""
        self._conn.close()

    def _setup_db(self):
        """Set up the database tables and constraints"""
        c = self._conn

        with c:
            # Create table for transactions
            c.execute('''
                CREATE TABLE IF NOT EXISTS
                [{0}] (
                    id text NOT NULL UNIQUE ON CONFLICT IGNORE,
                    storeId integer,
                    patch json
                )
                '''.format(self._table_name)
            )
            # Create table for checkpoints
            c.execute('''
                CREATE TABLE IF NOT EXISTS
                [checkpoints-{0}] (
                    id integer PRIMARY KEY ON CONFLICT REPLACE,
                    state text,
                    serial number
                )
                '''.format(self._table_name)
            )

    def add_transactions(self, transactions):
        """Add a sequence of transactions to the store.

        Returns a generator to the serial numbers of the added transactions.

        Note: Any transactions with ids already present in the store
        will be ignored.
        """
        c = self._conn
        with c:
            # Use executemany with dict lookup to insert
            # Note: The 'ON CONFLICT IGNORE' on the id assures
            # that duplicate transactions are discarded.
            c.executemany(
                '''
                    INSERT INTO [{0}](id, storeId, patch)
                    VALUES(?, ?, ?)
                '''.format(self._table_name),
                serialized(transactions)
            )

            ids = [t['id'] for t in transactions]
            subst = ','.join('?' * len(ids))

            return dict(decode_serials(
                c.execute(
                    '''
                        SELECT id, rowid
                        FROM [{0}]
                        WHERE id IN ({1})
                    '''.format(self._table_name, subst),
                    ids
                )
            ))


    def get_transactions(self, ids):
        """Get the transactions with the given ids.

        Returns a generator with the transactions in the store
        that match the given ids. Note that any missing ids will
        simply not be included in the result.
        """
        subst = ','.join('?' * len(ids))
        statement = '''
            SELECT id, storeId, patch, rowid
            FROM (
                SELECT *
                FROM [{0}]
                WHERE id IN ({1})
                ORDER BY rowid
            )
        '''.format(self._table_name, subst)

        yield from deserialized(
            self._conn.execute(statement, ids)
        )

    def history(self, checkpoint=None):
        """Get all stored transactions since checkpoint (in order)."""
        if checkpoint is None:
            serial = -1
        else:
            serial = tuple(self._conn.execute('''
                SELECT serial
                FROM
            '''))[0]
        yield from deserialized(
            self._conn.execute(
                '''
                    SELECT id, storeId, patch, rowid
                    FROM (
                        SELECT *
                        FROM [{0}]
                        WHERE checkpoint=?
                        ORDER BY rowid
                    )
                '''.format(self._table_name),
                (self.checkpoint_id,)
            )
        )

    def checkpoint(self, state, serial):
        """Make a checkpoint in the transaction history.

        This creates a new checkpoint after the given serial
        with the given serialized state.
        """

        # Insert the base for the new checkpoint into the checkpoint table
        try:
            c.execute(
                '''
                    INSERT INTO [checkpoints-{0}](id, state, serial)
                    VALUES(?, ?)
                '''.format(self._table_name),
                (self.checkpoint_id, state, serial)
            )
        else:
            self.checkpoint_id += 1


__all__ = ['DatastoreDB']
