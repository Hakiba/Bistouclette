// Point d'entrée Passenger à la racine du projet.
// Le serveur Fastify intégré sert à la fois le front et les routes /api.
require('./backend/build/server.js')
  .start()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
