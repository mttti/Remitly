
# Remitly Exercise

## Setting up project:
 **Clone the repo**
```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name 
```

**Run with Docker**
```bash
docker-compose --env-file .env.dev up
```
**Parse SWIFT codes data and insert into the database**
```bash
docker exec -it swift_api npm run import-data
```
API will be available at http://localhost:8080
## Running Unit and Integration tests
```bash
docker-compose --env-file .env.test --profile test up
```