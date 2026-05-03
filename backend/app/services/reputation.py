import httpx
from ..core.logging import logger
from ..core.config import settings
import redis

class ReputationService:
    def __init__(self):
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            decode_responses=True
        )
        self.REPUTATION_KEY = "b5:reputation"

    async def update_threat_intel(self):
        """
        Simulate pulling from a threat intel feed (e.g., AlienVault or blocklist.de)
        """
        logger.info("Updating threat intel feed...")
        
        # Example: In a real app, you would fetch a CSV or JSON from a URL
        # For now, we simulate with a dummy list of "bad" IPs
        dummy_bad_ips = ["1.2.3.4", "5.6.7.8", "9.10.11.12"]
        
        # Store in Redis set for fast lookup by Proxy
        for ip in dummy_bad_ips:
            self.redis_client.sadd(self.REPUTATION_KEY, ip)
            
        logger.info("Threat intel feed updated", count=len(dummy_bad_ips))

reputation_service = ReputationService()
