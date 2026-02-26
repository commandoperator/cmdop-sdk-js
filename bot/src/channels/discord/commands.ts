import { SlashCommandBuilder } from '@discordjs/builders';
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';

/**
 * Discord slash command definitions for CMDOP bot.
 *
 * All commands use the Interactions API (slash commands).
 * Message content intent is NOT required — preferred since 2022.
 */

export const DISCORD_COMMANDS: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  new SlashCommandBuilder()
    .setName('exec')
    .setDescription('Execute a shell command on a remote machine')
    .addStringOption((opt) =>
      opt
        .setName('command')
        .setDescription('The shell command to run (e.g. ls -la, df -h)')
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName('machine')
        .setDescription('Target machine hostname (uses default if omitted)')
        .setRequired(false),
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('agent')
    .setDescription('Run an AI agent task on a remote machine')
    .addStringOption((opt) =>
      opt
        .setName('prompt')
        .setDescription('The task for the AI agent to perform')
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName('machine')
        .setDescription('Target machine hostname (uses default if omitted)')
        .setRequired(false),
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('files')
    .setDescription('List files and directories on a remote machine')
    .addStringOption((opt) =>
      opt
        .setName('path')
        .setDescription('Directory path to list (default: home directory)')
        .setRequired(false),
    )
    .addStringOption((opt) =>
      opt
        .setName('machine')
        .setDescription('Target machine hostname (uses default if omitted)')
        .setRequired(false),
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available CMDOP commands and usage examples')
    .toJSON(),
];

/** All slash command names — used to build the prefix-based text fallback */
export const DISCORD_COMMAND_NAMES = DISCORD_COMMANDS.map((c) => c.name);
