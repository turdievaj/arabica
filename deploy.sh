#!/bin/bash
cd ~/arabica
git pull origin Arabica
npm install
pm2 restart arabica-bot
