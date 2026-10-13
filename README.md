# Risky Bit Docker Backend
> Diploma 2026/27

Docker backend of the RiskyBit project, made as the practical part of the team's diploma.


## Description
The container management service for [RiskyBit](https://github.com/DA-Risky-Bit/RiskyBit), a software collection in Docker that provides an environment for hacking challenges for companies and schools. It <starts, stops and resets challenge containers>. Built with Express.js.

## Installation
This service is part of the RiskyBit compose setup. For a normal installation, use the [main repository](https://github.com/DA-Risky-Bit/RiskyBit) instead.

### Local development

Install the dependencies:

```bash
npm install
```

Start the service:

```bash
npm start
```

The API will be available at `http://localhost:3000`.

> [!NOTE]
> This service needs access to the Docker socket (`/var/run/docker.sock`) to manage containers.

### Docker

```bash
docker build -t riskybit-docker-backend .
docker run -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock riskybit-docker-backend
```

## License
This project is licensed under MIT, specifics in:
[License](LICENSE)

## Contact
**Main Contact:** [contact@riskybit.com](mailto:contact@riskybit.com)

Team:
- **Valerian Hobel** – @htl3r-2135 [valerian.hobel@htl.rennweg.at](mailto:valerian.hobel@htl.rennweg.at)
- **Christoph Neumayer** – @ItzVoxel [christoph.neumayer@htl.rennweg.at](mailto:christoph.neumayer@htl.rennweg.at)
- **Gabriel Berger** – @htl3r-2129 [gabriel.berger@htl.rennweg.at](mailto:gabriel.berger@htl.rennweg.at)
- **Alexander Reiter** – @Sunnickel [alexander.reiter@htl.rennweg.at](mailto:alexander.reiter@htl.rennweg.at)
