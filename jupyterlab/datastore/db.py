
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
            t['version'],
        )

def deserialized(rows):
    for r in rows:
        yield dict(
            id=r[0],
            storeId=r[1],
            patch=json.loads(r[2], encoding='ascii'),
            version=r[3],
            serial=r[4],
        )

def decode_serials(rows):
    for r in rows:
        yield r[0:2]


History = collections.namedtuple('History', ('state', 'transactions'))


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
                    patch json,
                    version integer
                )
                '''.format(self._table_name)
            )
            # Create table for checkpoints
            c.execute('''
                CREATE TABLE IF NOT EXISTS
                [checkpoints-{0}] (
                    id integer PRIMARY KEY ON CONFLICT REPLACE,
                    state text,
                    serial integer
                )
                '''.format(self._table_name)
            )

    def add_transactions(self, transactions):
        """Add a sequence of transactions to the store.

        Returns a dictionary mapping the ids of the passed transactions
        to their serial numbers.

        Note: Any transactions with ids already present in the store
        will be ignored. Their existing serial number will still be present
        in the returned dictionary.
        """
        c = self._conn
        with c:
            # Use executemany with dict lookup to insert
            # Note: The 'ON CONFLICT IGNORE' on the id assures
            # that duplicate transactions are discarded.
            c.executemany(
                '''
                    INSERT INTO [{0}](id, storeId, patch, version)
                    VALUES(?, ?, ?, ?)
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

        Yields transactions in the store that match the given ids. Note that
        any missing ids will simply not be included in the result.
        """
        subst = ','.join('?' * len(ids))
        statement = '''
            SELECT id, storeId, patch, version, rowid
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

    def get_serials(self, serials):
        """Get the transactions with the given serials.

        Yields transactions in the store that match the given serials. Note
        that any missing serials will simply not be included in the result.
        """
        subst = ','.join('?' * len(serials))
        statement = '''
            SELECT id, storeId, patch, version, rowid
            FROM (
                SELECT *
                FROM [{0}]
                WHERE rowid IN ({1})
                ORDER BY rowid
            )
        '''.format(self._table_name, subst)

        yield from deserialized(
            self._conn.execute(statement, serials)
        )

    def has_transactions(self, ids):
        """Whether the transactions with the given ids exist in the db.

        Returns a generator of booleans indicating the prescence of the
        given ids.
        """
        ids = tuple(ids)
        subst = ','.join('?' * len(ids))
        statement = '''
            SELECT id
            FROM [{0}]
            WHERE id IN ({1})
        '''.format(self._table_name, subst)

        present = set(r[0] for r in self._conn.execute(statement, ids))
        return (i in present for i in ids)

    def make_checkpoint(self, state, serial):
        """Make a checkpoint in the transaction history.

        This creates a new checkpoint after the given serial
        with the given serialized state.
        """

        # Insert the base for the new checkpoint into the checkpoint table
        self._conn.execute(
            '''
                INSERT INTO [checkpoints-{0}](id, state, serial)
                VALUES(?, ?)
            '''.format(self._table_name),
            (self.checkpoint_id, state, serial)
        )
        self.checkpoint_id += 1

    def history(self, checkpoint_id=None):
        """Get the history for the given checkpoint id (in order).

        If the checkpoint id is not given, returns the full history
        since the start.

        Returns a namedtuple (state, transactions), with tranascations
        being an iterator of the transactions.
        """
        if checkpoint_id is None:
            serial = -1
            state = None
        else:
            serial, state = tuple(next(self._conn.execute(
                '''
                    SELECT serial, state, id
                    FROM [checkpoints-{0}]
                    WHERE id = ?
                    LIMIT 1
                '''.format(self._table_name),
                (checkpoint_id,)
            ), (-1, None)))[0:2]

        transactions = deserialized(
            self._conn.execute(
                '''
                    SELECT id, storeId, patch, version, rowid
                    FROM [{0}]
                    WHERE rowid > ?
                    ORDER BY rowid
                '''.format(self._table_name),
                (serial,)
            )
        )

        return History(state, transactions)


__all__ = ['DatastoreDB']
