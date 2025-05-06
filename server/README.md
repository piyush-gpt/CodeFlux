# REPL Clone Server

This is the backend server for the REPL Clone application.

## Environment Setup

1. Copy the `.env.example` file to a new file named `.env`:
   ```
   cp .env.example .env
   ```

2. Update the environment variables in the `.env` file with your actual values:

   - **Server Configuration**:
     - `PORT`: The port the server will run on (default: 5000)
     - `NODE_ENV`: Current environment (development/production)

   - **MongoDB Configuration**:
     - `MONGODB_URI`: Your MongoDB connection string

   - **JWT Configuration**:
     - `JWT_SECRET`: Secret key for JWT token generation

   - **Cloudflare R2 Configuration**:
     - `R2_ENDPOINT`: Your Cloudflare R2 endpoint URL (e.g., https://your-account.r2.cloudflarestorage.com)
     - `AWS_REGION`: Region for R2 (usually 'auto')
     - `AWS_ACCESS_KEY_ID`: Your R2 Access Key ID
     - `AWS_SECRET_ACCESS_KEY`: Your R2 Secret Access Key
     - `AWS_BUCKET_NAME`: Your R2 bucket name

## R2 Bucket Setup Requirements

Before using the REPL functionality, make sure your R2 bucket is set up with the following structure:

1. Create a `base` directory with subdirectories for each programming language (e.g., `base/javascript`, `base/python`, etc.)

2. In each language subdirectory, upload template files for new projects (basic project structure, starter files, etc.)

For example, for JavaScript/React:
- `base/javascript/package.json`
- `base/javascript/public/index.html`
- `base/javascript/src/App.js`
- etc.

## Starting the Server

```
npm install
npm start
``` 