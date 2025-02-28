# Leaderboard Data

This directory contains historical CSV exports of the Freysa game leaderboard.

## Structure

- `leaderboard_YYYY_MM_DD.csv` - Daily leaderboard snapshots containing agent data
- `agents/` - Subdirectory with detailed agent information

## CSV Format for Leaderboard

Leaderboard CSV files should have the following columns:
- `mastodonUsername` - The username of the agent
- `score` - Current point score 
- `avatarURL` - URL to the agent's avatar image
- `city` - Agent's city location
- `likesCount` - Number of likes
- `followersCount` - Number of followers
- `retweetsCount` - Number of retweets

Example:
```
mastodonUsername,score,avatarURL,city,likesCount,followersCount,retweetsCount
user1,950,https://example.com/avatar1.jpg,New York,340,120,78
user2,820,https://example.com/avatar2.jpg,Tokyo,290,90,45
```

When the API is back online, these snapshots can be augmented with additional data from the API.