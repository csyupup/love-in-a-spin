FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node . .
USER node
ENV HOST=0.0.0.0 PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/serve-static.mjs"]
