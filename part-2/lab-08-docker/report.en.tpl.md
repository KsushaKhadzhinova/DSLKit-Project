# Laboratory Work No. 8. Containerization of an Application with Docker

## 1 Purpose of the Work

To master containerization: describe the server and client images in Dockerfiles, build them and run them together with a database by one Docker Compose command. The packaged application is DSLKit, a web editor for diagrams as code (SaaS direction): the server with authentication from laboratory work 3, the React client from laboratory work 5 and a PostgreSQL database. This is the deployment base of the future course project.

## 2 Brief Theoretical Background

**Image and container.** An image consists of immutable file system layers and a start description. A container is a running instance of an image with a thin writable layer, so everything written inside a container is lost when the container is removed.

**Dockerfile.** The file lists build instructions: `FROM` picks the base image, `WORKDIR` sets the folder, `COPY` moves files, `RUN` runs a command at build time, `EXPOSE` documents a port and `CMD` sets the start command. Each instruction creates a layer and unchanged layers come from the cache, so dependency files are copied before the source code.

**Multi-stage build.** One Dockerfile has several `FROM` instructions. The first stage builds the project with all tools, and `COPY --from=builder` moves only the result into the final image. Node.js and the client sources do not reach the final image.

**Networks and volumes.** Containers in one Compose network find each other by service name. A volume lives outside the container and keeps the database data when the container is recreated.

**Docker Compose.** The `docker-compose.yml` file describes services, networks, volumes and the start order. The `docker compose up --build` command builds the images and starts the whole application.

## 3 Work Progress

### 3.1 Application structure

The application has three services. The `db` service runs PostgreSQL 16, the `backend` service is built from the server of laboratory work 3 and the `frontend` service is built from the client of laboratory work 5. The application code was not copied: Compose points to their folders as the build context and the Docker files live in the `part-2/lab-08-docker` folder. The application starts with `docker compose up --build`, after `.env.example` is copied to `.env` and filled in. The images build without errors and the containers run, as figure 1 shows.

![Running containers](figures/01-docker-ps.png)

Figure 1 – Three running containers with the healthy status, the docker ps command

### 3.2 Server Dockerfile

The server image is built in two stages, the listing is given in Appendix A. The first stage runs `npm ci --omit=dev` and installs only production dependencies. The native modules bcrypt and sqlite3 come prebuilt for Alpine, so no compiler is needed. The second stage copies the `node_modules` folder and the source code into a clean image without the npm cache. The `Dockerfile.dockerignore` file excludes tests, reports, `.env` and local databases, so secrets and extra files do not get into the image.

The process runs as the `node` user, not as root. On start the Sequelize migrations run, then the idempotent administrator seed, which is skipped without the `ADMIN_EMAIL` and `ADMIN_PASSWORD` variables, and then the server starts. The tables appear in an empty database by themselves.

### 3.3 Client Dockerfile

The client image is built in two stages too, the listing is given in Appendix B. The `builder` stage installs dependencies and runs `npm run build`. The server address is set to `/api` at build time, so the browser calls the same address the page was opened from and CORS is not needed. The final image is based on `nginx-unprivileged`: it holds only Nginx and the `dist` folder, and the process runs as an ordinary user on port 8080. The client image is about 74 MB and the server image about 313 MB.

### 3.4 The docker-compose.yml file

The listing is given in Appendix C. Containers talk by service name: the server connects to the database at `db:5432` and Nginx forwards requests to `backend:3000`. The database keeps its data in the named volume `pgdata`, so recreating the container does not erase it. This was checked: after `docker compose restart db` the users stayed in the table. The start order is set with `service_healthy` conditions: the server waits for the database and the client waits for the server.

The application opens at `http://localhost:8080`. Port 80 is not used because it is often taken on work machines, and the value is changed with the `FRONTEND_PORT` variable. The task text names ports 80 and 5000, they are obtained with `FRONTEND_PORT=80` and `BACKEND_PORT=5000` in `.env`. The stack is stopped with `docker compose down`, the containers stay listed by `docker ps` until then, and `docker compose down -v` removes the `pgdata` volume with the database data. The result is shown in figure 2.

![Login form in the browser](figures/02-app-login.png)

Figure 2 – The client from the Nginx container at localhost:8080

To check the whole chain, a user and three diagrams are created through the API, and the list is shown in figure 3. The requests go through the Nginx proxy into the server container and from there into the PostgreSQL database.

![List of diagrams](figures/03-app-list.png)

Figure 3 – List of diagrams received from PostgreSQL through Nginx and the server

### 3.5 Additional requirements

Eight additional requirements from the task list and several security measures are done.

1. **Environment variables.** The connection string, the database password and the JWT secret come from the `.env` file. The file is not committed and the `.env.example` sample has no values. Without `POSTGRES_PASSWORD` and `JWT_SECRET` Compose refuses to start and names the missing variable (Appendix E).
2. **Server healthcheck.** The server got a `GET /health` route that checks the database connection and answers 200 or 503. The route stands before the request log, so the probes do not fill the log table. The code is shown in Appendix F and two tests check it.
3. **Database healthcheck and `service_healthy`.** The `pg_isready` command checks that PostgreSQL is ready, and the server starts only after that.
4. **Network isolation.** The `internal` network is declared with `internal: true`: it has no way out and holds only the database and the server. The `public` network joins the server and the client. The database port is not published to the host.
5. **Nginx reverse proxy.** Nginx serves the static files, returns `index.html` for the routes of the single-page application and forwards `/api/` to the server (Appendix D). The `X-Forwarded-For` header is passed and the server has `TRUST_PROXY=1`, so the rate limiter sees the real client address.
6. **Running without root.** The server runs as `node` and Nginx as `nginx`. The server container is started with a read-only file system and without privileges (`cap_drop: ALL`, `no-new-privileges`).
7. **The `.dockerignore` file.** It excludes `node_modules`, tests, reports and `.env` from the build context.
8. **Registry mirror.** For the Republic of Belarus the `REGISTRY` variable is provided: the value `mirror.gcr.io/` is put before the base image names in both Dockerfiles and in Compose. The build and the pull of the PostgreSQL image through this mirror succeeded, and in the main run the images came from Docker Hub directly. Instead of the variable, a mirror can be set for the whole Docker daemon in `daemon.json` with the key `"registry-mirrors": ["https://mirror.gcr.io", "https://dockerhub.timeweb.cloud"]`. At the last edit of the report the Docker daemon was not running on the author machine, so the stack was not started again and the figures come from the earlier run.
9. **Resource limits and log rotation.** Every service has a memory limit (`mem_limit`), a process limit (`pids_limit`) and container log rotation (`max-size: 10m`, three files). One failing service cannot take all the memory and disk of the computer.

The state of the stack is confirmed by figure 4: the `/health` answers through the proxy and directly, the networks and the volume of the project.

![Checks](figures/04-checks.png)

Figure 4 – The /health answers, the internal and public networks and the pgdata volume

### 3.6 Verification

The structure of the Docker files is checked by six automated tests that run without a Docker daemon. They check the two-stage client build, installing production dependencies only, the `node` user, the `service_healthy` conditions, the database volume, the closed network, the absence of secret values in the sample file and the Nginx proxy. The server is covered by 92 tests, including two tests of the `/health` route. The launch is described in `README.md`. Repository branch: 28.

## Conclusion

The server, the client and the database are packed into containers and start with one command. The client is built in two stages and served by Nginx, and the same Nginx works as a proxy for the server. The database data is kept in a volume and health checks decide the start order. Secrets are moved to `.env`, the networks are separated and the processes run without root rights. This base is suitable for deploying the course project.

## Answers to Control Questions

{{answers}}
1. **How is a Docker image different from a Docker container?** An image is immutable and holds files and a start description, while a container is its running instance with its own writable layer. Many containers start from one image.
2. **What is the COPY --from=builder instruction used for in a multi-stage build?** It copies files from a previous stage into the current one. Only the build result gets into the final image, and Node.js with the sources stays in the `builder` stage.
3. **How do you connect containers by service name in Docker Compose?** The services only have to be in one network, usually the default network of the project. Then the service name works as a host name, for example `db:5432` or `backend:3000`.
4. **What is a volume and why is it needed for a database?** A volume is storage outside the container layer managed by Docker. The database writes into the `pgdata` volume, so the data survives recreating the container.
5. **How do you view the logs of running containers?** With `docker logs <container>`, and in Compose with `docker compose logs -f <service>`. The `-f` key follows new lines.
6. **How do you reduce the size of a Docker image? Name at least 3 ways.** Take a light base image like Alpine, use a multi-stage build, install production dependencies only (`npm ci --omit=dev`), exclude extra files with `.dockerignore` and clean caches in the same `RUN` instruction.
7. **Which Dockerfile instruction sets the default command on container start?** The `CMD` instruction. It can be replaced by the arguments of `docker run`.
8. **What is the difference between CMD and ENTRYPOINT?** `CMD` sets a default command that is easy to replace at start. `ENTRYPOINT` sets the program to run and the start arguments are appended to it. They are often used together.
9. **How do you set the start dependency of containers in Docker Compose (so the database starts before the backend)?** With the `depends_on` key. For the server to wait for the database being ready and not just started, add `condition: service_healthy` and a healthcheck for the database.
10. **How do you run a command inside a running container (for example open a shell)?** With `docker exec -it <container> sh`, and in Compose with `docker compose exec backend sh`.
11. **How do you publish a port from the host to a container in Docker Compose?** With the `ports` key in the `"host:container"` format, for example `"8080:8080"`. It can be bound to an address like `127.0.0.1:3000:3000`.
12. **How do you use a .env file for environment variables in Docker Compose?** Compose reads `.env` next to `docker-compose.yml` by itself and substitutes values written as `${NAME}`. A default is set with `${NAME:-default}` and a required value with `${NAME:?message}`.
13. **What is a healthcheck in Docker and why is it needed?** It is a command that Docker runs in the container periodically to learn whether the application works. The healthy status is needed for start conditions, for restarts and for load balancers.
14. **How do you publish your own image to an alternative registry (for example GitLab Container Registry)?** Log in with `docker login registry.gitlab.com`, name the image like `registry.gitlab.com/group/project/name:tag` with `docker tag` and run `docker push`.
15. **What happens if no volume is mounted for the database? What happens on container restart?** The data lies in the container layer. A restart keeps it, but removing or recreating the container erases all the database data.
16. **How do you scale a service (for example backend) to several instances in Docker Compose? What are the limits?** With `docker compose up --scale backend=3`. One host port cannot be published for all instances and `container_name` cannot be set, a load balancer is needed and in-memory state such as the rate limiter counters differs between the instances.
{{/answers}}

## Appendix A (mandatory) Listing of the server Dockerfile

{{code:part-2/lab-08-docker/backend/Dockerfile}}

## Appendix B (mandatory) Listing of the client Dockerfile

{{code:part-2/lab-08-docker/frontend/Dockerfile}}

## Appendix C (mandatory) Listing of the docker-compose.yml file

{{code:part-2/lab-08-docker/docker-compose.yml}}

## Appendix D (mandatory) Listing of the nginx.conf file

{{code:part-2/lab-08-docker/frontend/nginx.conf}}

## Appendix E (mandatory) Sample of the .env.example file

{{code:part-2/lab-08-docker/.env.example}}

## Appendix F (mandatory) Listing of the server app.js file with the /health route

{{code:part-2/lab-03-auth/src/app.js}}
