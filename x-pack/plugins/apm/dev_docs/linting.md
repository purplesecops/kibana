# Linting

_Note: Run the commands from the root of Kibana._

### Typescript

```
node scripts/type_check.js --project x-pack/plugins/apm/tsconfig.json
```

### Prettier

```
yarn prettier  "./x-pack/plugins/apm/**/*.{tsx,ts,js}" --write
```

### ESLint

```
node scripts/eslint.js x-pack/plugins/apm
```
