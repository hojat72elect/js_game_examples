import { resolve } from 'node:path';
import fs from 'node:fs';

const rootDir = import.meta.dirname;

const games = [
  { id: '1', name: 'example_1_hello_world', title: 'Hello World' },
  { id: '2', name: 'example_2_3d', title: '3D Example' },
  { id: '3', name: 'example_3_2D_physics', title: '2D Physics (Box2D)' },
  { id: '4', name: 'example_4_breakout', title: 'Breakout' },
  { id: '5', name: 'example_5_html_menu', title: 'HTML Menu' },
  { id: '6', name: 'example_6_module', title: 'Module Demo' },
  { id: '7', name: 'example_7_particle_editor', title: 'Particle Designer' },
  { id: '8', name: 'example_8_platformer', title: 'Platformer' },
  { id: '9', name: 'example_9_match_three', title: 'Match Three' },
  { id: '10', name: 'example_10_3D', title: 'Three.js 3D Platformer' }
];

const rollupInputs = {
  main: resolve(rootDir, 'index.html')
};

for (const game of games) {
  const htmlPath = resolve(rootDir, 'src', game.name, 'index.html');
  if (fs.existsSync(htmlPath)) {
    rollupInputs[game.name] = htmlPath;
  }
}

function gamesDevPlugin() {
  return {
    name: 'games-dev-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (!url) return next();

        for (const game of games) {
          const match =
            url === `/${game.id}` ||
            url === `/${game.id}/` ||
            url === `/game/${game.id}` ||
            url === `/game/${game.id}/` ||
            url === `/${game.name}` ||
            url === `/${game.name}/` ||
            url === `/example_${game.id}` ||
            url === `/example_${game.id}/`;

          if (match) {
            res.writeHead(302, { Location: `/src/${game.name}/index.html` });
            res.end();
            return;
          }
        }
        next();
      });
    }
  };
}

function copyGameAssetsPlugin() {
  return {
    name: 'copy-game-assets-plugin',
    closeBundle() {
      const distDir = resolve(rootDir, 'dist');
      if (!fs.existsSync(distDir)) return;

      const srcDir = resolve(rootDir, 'src');
      if (fs.existsSync(srcDir)) {
        for (const game of games) {
          const gameSrcDir = resolve(srcDir, game.name);
          const gameDistDir = resolve(distDir, 'src', game.name);
          if (!fs.existsSync(gameSrcDir)) continue;

          fs.mkdirSync(gameDistDir, { recursive: true });

          const copyRecursive = (from, to) => {
            const entries = fs.readdirSync(from, { withFileTypes: true });
            for (const entry of entries) {
              const srcPath = resolve(from, entry.name);
              const destPath = resolve(to, entry.name);
              if (entry.isDirectory()) {
                fs.mkdirSync(destPath, { recursive: true });
                copyRecursive(srcPath, destPath);
              } else if (entry.name !== 'index.html' && !fs.existsSync(destPath)) {
                fs.copyFileSync(srcPath, destPath);
              }
            }
          };

          copyRecursive(gameSrcDir, gameDistDir);
        }
      }

      const ljsDist = resolve(rootDir, 'node_modules', 'littlejsengine', 'dist');
      const targetLjsDist = resolve(distDir, 'node_modules', 'littlejsengine', 'dist');
      if (fs.existsSync(ljsDist)) {
        fs.mkdirSync(targetLjsDist, { recursive: true });
        for (const file of fs.readdirSync(ljsDist)) {
          fs.copyFileSync(resolve(ljsDist, file), resolve(targetLjsDist, file));
        }
      }
    }
  };
}

export default {
  plugins: [gamesDevPlugin(), copyGameAssetsPlugin()],
  resolve: {
    alias: {
      three: 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js'
    }
  },
  server: {
    fs: {
      allow: ['.']
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: rollupInputs,
      external: [
        'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js'
      ]
    }
  }
};
