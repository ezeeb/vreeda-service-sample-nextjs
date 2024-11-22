## Install Dependencies

- nodejs: https://nodejs.org/
- yarn: `$ npm install --global yarn`
- docker: https://www.docker.com/products/docker-desktop/


And then install all remaining dependencies with yarn:

```bash
$ yarn install
```

## Configuration

You have to create a `.env.local` with the following entries

```
NEXTAUTH_URL=https://localhost:3000
NEXTAUTH_SECRET=<create this with npx auth secret>
AZURE_AD_B2C_CLIENT_ID=<ask for client id at vreeda>
AZURE_AD_B2C_CLIENT_SECRET=<ask for client secret at vreeda>
AZURE_AD_B2C_TENANT_NAME="vreedaid"
AZURE_AD_B2C_PRIMARY_USER_FLOW="B2C_1A_VREELI_SERVICE_SIGNIN_PROD"
VREEDA_API_BASEURL="https://client-rest.api.vreeda.com"
MONGODB_URI="mongodb://root:example@localhost:27017"
API_REFRESH_TOKENS_JOB_KEY=your-secure-key
```

## Getting Started With Development

First, run the development server:

```bash
yarn dev
```

Open [https://localhost:3000](https://localhost:3000) with your browser to see the result.

This project uses [next.js](https://nextjs.org/docs) for the backend and [React](https://react.dev/) in combination with [React Material UI](https://mui.com/material-ui/getting-started/) for the frontend.

You can start editing the frontend by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

You can extend the backend logic in the `src/app/api` folder and subfolders. The backend auto-updates as you edit files. 

The backend contains the basic functionality to implement a vreeda service:

- authentication and authorization based on vreeda id management in `src/app/api/auth`
- user configuration and device access token management in `src/app/api/user`
- basic vreeda api client in `src/app/api/vreeda`
- externally triggered background jobs in `src/app/api/jobs` 

## Learn More

To learn more about the Vreeda platform, take a look at the following resources:

- [API Documentation](https://api.vreeda.com/)
