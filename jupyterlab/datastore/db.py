
import collections
from itertools import chain
import json
import sqlite3
import re


sqlite3.enable_callback_tracebacks(True)

def serialized(transactions, checkpoint_id):
    for t in transactions:
        yield (
            t['id'],
            t['storeId'],
            json.dumps(t['patch']).encode('ascii'),
            checkpoint_id,
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
    if _table_name_re.fullmatch(name) is None:
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
            # Create table
            c.execute('''
                CREATE TABLE IF NOT EXISTS
                [{0}] (
                    id text NOT NULL UNIQUE ON CONFLICT IGNORE,
                    storeId integer,
                    patch json,
                    checkpoint integer
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
                    INSERT INTO [{0}](id, storeId, patch, checkpoint)
                    VALUES(?, ?, ?, ?)
                '''.format(self._table_name),
                serialized(transactions, self.checkpoint_id)
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

    def history(self):
        """Get all transactions stored (in order)."""
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

    def checkpoint(self, base_transaction, replaced_transaction_ids):
        """Make a checkpoint in the transaction history.

        This adds one transaction (`base_transaction`) that replaces
        a set of other transactions (`replaced_transaction_ids`).
        """
        # TODO: Write a ton of unit cases for this function!

        # - Validation:
        #   All replaced tranasctions should be from the current checkpoint.
        # - The base transaction should be the first transaction in the new checkpoint.
        # - Any transactions on the current checkpoint that is not replaced
        #   should:
        #   * Have their checkpoint updated to the new current id
        #   * Have their rowid updated to follow that of the base transaction

        # Validation:
        subst = ','.join('?' * len(replaced_transaction_ids))
        invalid = 0 < len(self._conn.execute(
            '''
                SELECT id, checkpoint
                FROM [{0}]
                WHERE (
                    id IN ({1}),
                    checkpoint != ?
                )
                LIMIT 1
            '''.format(self._table_name, subst),
            chain(replaced_transaction_ids, (self.checkpoint_id,))
        ))
        if invalid:
            raise ValueError('Invalid checkpoint')

        # Perform all operations in one commit:
        with self._conn as c:
            # Insert the new base transaction for the new checkpoint
            old_checkpoint_id = self.checkpoint_id
            self.checkpoint_id += 1

            base_entry = tuple(serialized([base_transaction], self.checkpoint_id))[0]
            c.execute(
                '''
                    INSERT INTO [{0}](id, storeId, patch, checkpoint)
                    VALUES(?, ?, ?, ?)
                '''.format(self._table_name),
                base_entry
            )

            # Get rowid of base:
            base_rowid = tuple(self._conn.execute(
                'SELECT rowid, id FROM [{0}] WHERE id = ?'.format(self._table_name),
                base_transaction['id']
            ))[0][0]

            # Update transactions not included in checkpoint:
            # Update rowid by replacing rows:
            c.execute(
                '''
                    REPLACE INTO [{0}](id, storeId, patch, checkpoint)
                    SELECT id, storeId, patch, checkpoint
                    FROM (
                        SELECT *
                        FROM [{0}]
                        WHERE (
                            checkpoint == ?,
                            id NOT IN ({1})
                        )
                        ORDER BY rowid
                    )
                '''.format(self._table_name, replaced_transaction_ids),
                (old_checkpoint_id,)
            )
            # Update checkpoint id:
            c.execute(
                '''
                    UPDATE [{0}]
                    SET checkpoint = ?
                    WHERE (
                        checkpoint == ?,
                        id NOT IN ({1})
                    )
                '''.format(self._table_name, replaced_transaction_ids),
                (self.checkpoint_id, old_checkpoint_id)
            )



__all__ = ['DatastoreDB']
