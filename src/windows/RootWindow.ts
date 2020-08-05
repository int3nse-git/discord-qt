import { QStackedWidget, QMainWindow, QIcon, WidgetAttribute } from "@nodegui/nodegui";
import path from "path";
import fs from "fs";
import { app } from '..';
import { Client, Constants } from 'discord.js';
import { MainView } from '../views/MainView/MainView';
import './RootWindow.scss';
import { SettingsView } from "../views/SettingsView/SettingsView";
import { Account } from "../structures/Account";
import { Events } from "../structures/Events";
import { CustomStatusDialog } from '../dialogs/CustomStatusDialog/CustomStatusDialog';
import { EmojiPicker } from '../components/EmojiPicker/EmojiPicker';

const { version, name } = require('../../package.json');

export class RootWindow extends QMainWindow {
  private root = new QStackedWidget();
  emojiPicker = new EmojiPicker(this);
  popovers = {
    customStatus: new CustomStatusDialog(this),
  };
  private mainView = new MainView();
  private settingsView = new SettingsView();

  constructor() {
    super();
    this.loadStyles();
    this.loadIcon();
    this.initializeWindow();

    app.on(Events.SWITCH_VIEW, (view: string) => {
      switch (view) {
        case 'main':
          this.root.setCurrentWidget(this.mainView);
          break;
        case 'settings':
          this.root.setCurrentWidget(this.settingsView);
          break;
      }
    });

    app.on(Events.READY, () => {
      const autoAccount = app.config.accounts?.find(a => a.autoLogin);
      if (autoAccount) this.loadClient(autoAccount);
    })
  }

  protected initializeWindow() {
    this.setWindowTitle("Discord-Qt");
    this.setObjectName("RootWindow");
    this.setMinimumSize(1000, 500);
    this.resize(1200, 600);
    this.setAttribute(WidgetAttribute.WA_AlwaysShowToolTips, true);
    this.setCentralWidget(this.root);
    this.root.addWidget(this.mainView);
    this.root.addWidget(this.settingsView);
    this.root.setCurrentWidget(this.mainView);
  }

  protected async loadStyles() {
    const stylesheet = await fs.promises.readFile(path.resolve(__dirname, "index.css"), "utf8");
    this.setStyleSheet(stylesheet);
  }
  protected loadIcon() {
    const icon = new QIcon(path.resolve(__dirname, "./assets/icon.png"));
    this.setWindowIcon(icon);
  }

  public async loadClient(account: Account): Promise<boolean> {
    const { Events: DiscordEvents } = Constants;
    if (app.client) await app.client.destroy();
    app.client = new Client({
      useUserGateway: true,
      waitForGuildsTimeout: 0,
      userAgent: `Discord-Qt/${version} Node.js/${process.version}`,
      ws: {
        compress: false,
        // @ts-ignore
        properties: {
          os: process.platform,
          browser: "DiscordQt",
          release_channel: "stable",
          client_version: version,
          os_arch: process.arch,
          // @ts-ignore
          client_build_number: __BUILDNUM__ || 0,
        }
      }
    });
    app.client.on(DiscordEvents.ERROR, console.error)
    if (app.config.debug) app.client.on(DiscordEvents.DEBUG, console.debug)
    app.client.on(DiscordEvents.WARN, console.warn)
    try {
      await app.client.login(account.token);
      this.setWindowTitle(`Discord-Qt • ${app.client.user?.username}#${app.client.user?.discriminator}`);
      app.emit(Events.SWITCH_VIEW, 'dm');
      return true;
    } catch (e) {
      console.log(e);
      this.setWindowTitle(`Discord-Qt • Not logged in`);
      return false;
    }
  }
}