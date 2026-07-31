import 'dotenv/config';
import { parseAuthConfig } from '../src/features/auth/auth.config';

const result = parseAuthConfig(process.env);

if (!result.success) {
  console.error('Configuration Entra invalide ou incomplete.');
  console.error(`Variables manquantes ou invalides : ${result.missing.join(', ')}`);
  process.exit(1);
}

console.log('Configuration Entra valide.');
console.log(`Tenant configure, redirection vers ${result.data.ENTRA_REDIRECT_URI}.`);
console.log(`Gestionnaire pilote : ${result.data.GESTA_MANAGER_EMAIL}.`);
