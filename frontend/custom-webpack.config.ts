import Dotenv from "dotenv-webpack";

plugins: [
    new Dotenv({
        path: "env", // Path to .env file
        safe: true, // Load .env.example (defaults to “false” which does not use dotenv-safe)
        systemvars: true, // Load all system variables as well (useful for CI purposes)
        silent: true, // Hide any errors
        defaults: false // Load .env.defaults if it exists
    })
]