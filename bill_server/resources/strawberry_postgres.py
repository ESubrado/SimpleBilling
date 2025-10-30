"""
This module contains Strawberry GraphQL resolvers for interacting with the PostgreSQL server.
"""


import strawberry
from typing import List, Optional
from flask import Flask, request, jsonify

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def get_connection():
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT")
    )


# User Strawberry type
@strawberry.type
class User:
    id: int
    username: str
    email: str
    description: Optional[str] = None


# Example query resolver
@strawberry.type
class Query:
    @strawberry.field
    def users(self) -> List[User]:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, username, email, description FROM users")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [User(id=row[0], username=row[1], email=row[2], description=row[3]) for row in rows]

schema = strawberry.Schema(query=Query)

# Flask route logic as a function (not decorated)
def all200_users():
    from flask import jsonify
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, username, email, description FROM users LIMIT 200")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    users = [
        {
            "id": row[0],
            "username": row[1],
            "email": row[2],
            "description": row[3]
        }
        for row in rows
    ]
    return jsonify({"users": users})

def users_query():
    from flask import request, jsonify  # ensure correct context
    query = request.args.get("query")
    if not query:
        return jsonify({"error": "Missing 'query' parameter"}), 400
    result = schema.execute_sync(query)
    response = {}
    if result.errors:
        response["errors"] = [str(e) for e in result.errors]
    if result.data:
        response["data"] = result.data
    return jsonify(response)


