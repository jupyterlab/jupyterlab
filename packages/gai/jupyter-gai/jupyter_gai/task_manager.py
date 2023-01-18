import asyncio
import aiosqlite
import os
from typing import Optional

from jupyter_core.paths import jupyter_data_dir
from .models import ListTasksResponse, ListTasksEntry, DescribeTaskResponse

class TaskManager:
    db_path = os.path.join(jupyter_data_dir(), "gai_task_manager.db")

    def __init__(self, gai_engines):
        self.gai_engines = gai_engines
        self.db_initialized = asyncio.create_task(self.init_db())
 
    async def init_db(self):
        async with aiosqlite.connect(self.db_path) as con:
            await con.execute(
                "CREATE TABLE IF NOT EXISTS tasks ("
                "id TEXT NOT NULL PRIMARY KEY, "
                "name TEXT NOT NULL, "
                "engine TEXT NOT NULL, "
                "prompt_template TEXT NOT NULL, "
                "insertion_mode TEXT NOT NULL, "
                "is_default INTEGER NOT NULL"
                ")"
            )

            # delete and recreate all default tasks. this ensures the default
            # tasks exposed by model engines are all up-to-date.
            await con.execute("DELETE FROM tasks WHERE is_default = 1")
            for engine_name in self.gai_engines:
                engine = self.gai_engines[engine_name]
                for task in engine.list_default_tasks():
                    id = engine.name + ":" + task["id"]
                    await con.execute(
                        "INSERT INTO tasks (id, name, engine, prompt_template, insertion_mode, is_default) VALUES (?, ?, ?, ?, ?, ?)",
                        (id, task["name"], engine.name, task["prompt_template"], task["insertion_mode"], 1)
                    )
            
            await con.commit()
    
    async def list_tasks(self) -> ListTasksResponse:
        await self.db_initialized
        async with aiosqlite.connect(self.db_path) as con:
            cursor = await con.execute(
                "SELECT id, name, engine FROM tasks"
            )
            rows = await cursor.fetchall()
            tasks = []

            if not rows:
                return tasks
            
            for row in rows:
                tasks.append(ListTasksEntry(
                    id=row[0],
                    name=row[1],
                    engine=row[2]
                ))
            
            return ListTasksResponse(tasks=tasks)
        
    async def describe_task(self, id: str) -> Optional[DescribeTaskResponse]:
        await self.db_initialized
        async with aiosqlite.connect(self.db_path) as con:
            cursor = await con.execute(
                "SELECT name, engine, prompt_template, insertion_mode FROM tasks WHERE id = ?", (id,)
            )
            row = await cursor.fetchone()

            if row is None:
                return None
            
            return DescribeTaskResponse(
                name=row[0],
                engine=row[1],
                prompt_template=row[2],
                insertion_mode=row[3]
            )
    