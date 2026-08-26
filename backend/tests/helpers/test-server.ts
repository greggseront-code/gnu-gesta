import http from 'http';
import { app } from '../../src/app';

/**
 * Un seul serveur HTTP pour toute la suite : supertest, quand on lui passe une
 * app Express, ouvre puis ferme un serveur par requête. Les ports éphémères
 * ainsi recyclés provoquaient des requêtes envoyées à un port déjà réattribué
 * (404/401 étrangers, timeouts). Voir docs — diagnostic tests backend.
 */
export const testServer = http.createServer(app).listen(0);
testServer.unref();
