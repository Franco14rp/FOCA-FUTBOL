/*
 * Migra emails desde el export de Firebase Auth (users.json en la raíz del
 * proyecto) a la base local. Las contraseñas de Firebase NO se pueden migrar
 * (usan scrypt con una clave del proyecto que no está en el export), así que
 * a cada usuario se le genera una contraseña temporal aleatoria que tiene que
 * cambiar en su primer login.
 *
 * users.json solo trae el registro de Auth (email + uid), no los documentos
 * de Firestore (name, role, playerStats, matches). Si tenés un export de
 * Firestore, pasalo con --firestore-export=<archivo.json> para completar
 * name/role/stats; si no, se usa la parte del email como nombre y el rol
 * "common" por defecto (ajustalo a mano después con la pantalla de
 * Administrar Usuarios).
 *
 * Uso:
 *   node scripts/migrate-firebase-users.js [--users-json=../users.json] [--firestore-export=firestore-export.json]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    args[key] = value ?? true;
  }
  return args;
}

function calcPromedio(ataque, defensa, corre) {
  return parseFloat((((ataque + defensa + corre) / 300) * 100).toFixed(2));
}

async function main() {
  const args = parseArgs();
  const usersJsonPath = path.resolve(process.cwd(), args['users-json'] || '../users.json');
  const firestoreExportPath = args['firestore-export']
    ? path.resolve(process.cwd(), args['firestore-export'])
    : null;

  if (!fs.existsSync(usersJsonPath)) {
    console.error(`No encontré ${usersJsonPath}. Pasalo con --users-json=<ruta>`);
    process.exit(1);
  }

  const { users } = JSON.parse(fs.readFileSync(usersJsonPath, 'utf-8'));
  const firestoreUsers = firestoreExportPath && fs.existsSync(firestoreExportPath)
    ? JSON.parse(fs.readFileSync(firestoreExportPath, 'utf-8'))
    : null;

  const tempPasswords = [];

  for (const fbUser of users) {
    const existing = await prisma.user.findUnique({ where: { email: fbUser.email } });
    if (existing) {
      console.log(`- ${fbUser.email} ya existe, salteado`);
      continue;
    }

    const profile = firestoreUsers?.users?.[fbUser.localId];
    const name = profile?.name || fbUser.email.split('@')[0];
    const role = profile?.role || 'common';

    const tempPassword = crypto.randomBytes(6).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const stats = firestoreUsers?.playerStats?.[fbUser.localId];
    const ataque = stats?.ataque ?? 65;
    const defensa = stats?.defensa ?? 65;
    const corre = stats?.corre ?? 65;

    await prisma.user.create({
      data: {
        email: fbUser.email,
        name,
        role,
        passwordHash,
        playerStats: {
          create: {
            name,
            ataque,
            defensa,
            corre,
            plus: stats?.plus ?? 0,
            promedio: calcPromedio(ataque, defensa, corre),
          },
        },
      },
    });

    tempPasswords.push({ email: fbUser.email, tempPassword });
    console.log(`+ ${fbUser.email} migrado (rol: ${role})`);
  }

  if (tempPasswords.length > 0) {
    console.log('\nContraseñas temporales generadas (compartilas por un canal seguro, no por acá):');
    tempPasswords.forEach(({ email, tempPassword }) => console.log(`  ${email} -> ${tempPassword}`));
    console.log('\nCada usuario debería loguearse con esa contraseña temporal y cambiarla.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
