## Kosmos Project

## Project Overview
The Kosmos project is a collection of interactive games designed to provide an engaging experience for users. Each game features unique mechanics and challenges, and players can transition seamlessly between games.

## Uses technologies 

- Vue Js
- TypeScript
- Three.js

## Running the Project
To run the project locally, use the following command:
```bash
npm run serve
```

## Docker Setup
To run the project in a Docker container, follow these steps:
1. Build the Docker image:
   ```bash
   docker build -t kosmos .
   ```
2. Run the Docker container:
   ```bash
   docker run -p 8080:8080 kosmos
   ```

## Project Context
The project includes the following games:
- AsteroidDodge3DGame
- TelescopeGame
- SpaceHangmanGame
- AlienHunt3DGame
- Maze3DGame
- KoesioQuizGame

Each game features a "Continue" button to allow players to transition seamlessly to the next game in the sequence.