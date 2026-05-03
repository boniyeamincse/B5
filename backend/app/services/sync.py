import json
import redis
from ..core.config import settings

class SyncService:
    def __init__(self):
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            decode_responses=True
        )
        self.RULES_KEY = "b5:rules"

    def sync_rules(self, rules_data):
        """
        rules_data: list of dicts containing rule info
        """
        # Store as a JSON string in a single key for simple atomic reload in Lua
        # Alternatively, use a hash or set depending on Lua implementation
        serialized_rules = json.dumps(rules_data)
        self.redis_client.set(self.RULES_KEY, serialized_rules)
        
        # Publish a message to notify proxy workers
        self.redis_client.publish("b5:sync", "reload")

sync_service = SyncService()
