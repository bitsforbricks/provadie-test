export declare interface Settings {}

// Load/parse the configuration
const loadConfiguration = (): Settings => {
  try {
    if (!process.env.CONFIG) {
      if (!process.env.PROJECT) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('./development.json');
      }
      console.error('Config not set');
      return {} as any;
    }
    return JSON.parse(Buffer.from(process.env.CONFIG, 'base64').toString('utf8'));
  } catch (err) {
    console.error('Failed to parse config: ' + err.stack);
    return {} as any;
  }
};
export default loadConfiguration();
