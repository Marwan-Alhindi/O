"""Agent implementations: chat, planner, join.

Phase 1: each module wraps the existing raw-OpenAI logic. Subsequent phases
swap the implementation to LangChain primitives without changing the
public surface (run_agent_stream, run_planner, generate_join_message).
"""
