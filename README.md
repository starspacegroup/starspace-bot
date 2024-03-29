## External requirements:

- MongoDB

## Getting started:

- Rename or copy .env-example to .env
- Add discord bot token etc...
- Run `yarn build`
- Run `yarn start`

## Deploying your own bot:

- Copy or clone this repo
- Create a mongodb instance somewhere, you can get a free one that should work for a while at mongodb.com
- Create a new AWS account (if you want to use AWS free tier EC2 for a year)
- Spin up a Linux server, I am using Amazon Linux
- Install node and optionally yarn (I think that's it if not should be easy to figure out, or let me know)
- Git clone the new repo
- Move the .env-example file to .env
- Fill in the discord api app ID and key, the server ID for your server, and the mongo DB user/pass/url in the .env file
- Use npm or yarn to run: `build` and `deployCommands`
- Set up something like systemd to start and keep the bot running as a service (there is a file called adhere-systemd.service that may help after some edits)
