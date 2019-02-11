
import collections
import json
import sqlite3


def serialized(transactions):
    for t in transactions:
        yield (
            t['id'],
            t['storeId'],
            json.dumps(t['patch']).encode('ascii')
        )

def deserialized(rows):
    for r in rows:
        yield dict(
            id=r[0],
            storeId=r[1],
            patch=json.loads(r[2], encoding='ascii')
        )


class DatastoreDB:

    def __init__(self, db_file=None):
        self._transactions = []
        self._conn = sqlite3.connect(
            db_file or ':memory:',
            detect_types=sqlite3.PARSE_DECLTYPES
        )
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
                transactions (
                    id text PRIMARY KEY ON CONFLICT IGNORE,
                    storeId integer,
                    patch json
                )
                WITHOUT ROWID''')

    def add_transactions(self, transactions):
        """Add a sequence of transactions to the store.

        Note: Any transactions with ids already present in the store
        will be ignored.
        """
        c = self._conn
        with c:
            # Use executemany with dict lookup to insert
            # Note: The 'ON CONFLICT IGNORE' on the id assures
            # that duplicate transactions are discarded.
            c.executemany(
                '''INSERT INTO transactions(id, storeId, patch)
                VALUES(?, ?, ?)''',
                serialized(transactions)
            )

    def get_transactions(self, ids):
        """Get the transactions with the given ids.

        Returns a generator with the transactions in the store
        that match the given ids. Note that any missing ids will
        simply not be included in the result.
        """
        subst = ','.join('?' * len(ids))
        statement = "SELECT id, storeId, patch FROM transactions WHERE id IN ({0})".format(subst)
        # FIXME: Use 'yield from' when python dep allows it
        for t in deserialized(
            self._conn.execute(statement, ids)
        ):
            yield t

    def history(self):
        """Get all transactions stored (in order)."""
        # FIXME: Use 'yield from' when python dep allows it
        for t in deserialized(
            self._conn.execute('SELECT id, storeId, patch FROM transactions')
        ):
            yield t

__all__ = ['DatastoreDB']
