import { RootWindow } from "./windows/RootWindow";
import { Client } from "discord.js";
import path, { join } from 'path';
import fs, { existsSync } from 'fs';
import { EventEmitter } from "events";
import {QFontDatabase} from '@nodegui/nodegui';
import envPaths from 'env-paths';
import { Config } from "./structures/Config";
import { Events } from "./structures/Events";

const { writeFile, mkdir, readFile, readdir } = fs.promises;
const FONTS_PATH = path.join(__dirname, './assets/fonts');
const paths = envPaths('discord', {suffix: 'qt'})
const CONFIG_PATH = path.join(paths.config, 'config.json');

class Application extends EventEmitter {
  config = new Config(CONFIG_PATH);

  constructor() {
    super();
    this.setMaxListeners(128);
  }
  public async start() {
    await this.loadFonts();
    this.window = new RootWindow();
    this.window.show();
    await this.config.load();
    this.emit(Events.READY);
  }

  private async loadFonts() {
    if (!existsSync(FONTS_PATH)) return;
    for (const file of await readdir(FONTS_PATH))
      QFontDatabase.addApplicationFont(path.join(FONTS_PATH, file))
  }

  public get window(): RootWindow {
    return (global as any).win;
  }
  public set window(v: RootWindow) {
    (global as any).win = v;
  }

  public get client(): Client {
    return (global as any).client;
  }
  public set client(v: Client) {
    (global as any).client = v;
    this.emit(Events.NEW_CLIENT, v);
  }
}
export const app = new Application();
export const MAX_QSIZE = 16777215;
app.start();