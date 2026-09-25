"""
Cache Management Tools for Boring Agent
Implements multi-user isolated layout caching by userId + graphVersion + layoutProfile.
"""
from typing import Dict, Any, Optional

# In-memory LRU / Hash cache for development and agent runtime
_AGENT_LAYOUT_CACHE: Dict[str, Dict[str, Any]] = {}

def compute_cache_key(user_id: str, graph_version: str, layout_profile: str = "default") -> str:
    """
    Enforces user isolation: User A's cache is never accessible to User B.
    """
    return f"{user_id}::{graph_version}::{layout_profile}"

def get_cached_layout(user_id: str, graph_version: str, layout_profile: str = "default") -> Optional[Dict[str, Any]]:
    """
    Retrieves cached layout if present for the scoped user and exact graphVersion.
    """
    key = compute_cache_key(user_id, graph_version, layout_profile)
    return _AGENT_LAYOUT_CACHE.get(key)

def save_layout(
    user_id: str,
    graph_version: str,
    layout: Dict[str, Any],
    layout_profile: str = "default"
) -> None:
    """
    Stores validated layout under the isolated user key.
    """
    key = compute_cache_key(user_id, graph_version, layout_profile)
    _AGENT_LAYOUT_CACHE[key] = layout

def clear_cache() -> None:
    """
    Clears all cached layouts.
    """
    _AGENT_LAYOUT_CACHE.clear()
