import { describe, it, expect } from 'vitest';
import { DISCORD_COMMANDS, DISCORD_COMMAND_NAMES } from '../../../src/channels/discord/commands.js';

describe('DISCORD_COMMANDS', () => {
  it('defines exec, agent, files, help commands', () => {
    const names = DISCORD_COMMANDS.map((c) => c.name);
    expect(names).toContain('exec');
    expect(names).toContain('agent');
    expect(names).toContain('files');
    expect(names).toContain('help');
  });

  it('exec command has required "command" option', () => {
    const exec = DISCORD_COMMANDS.find((c) => c.name === 'exec');
    expect(exec).toBeDefined();
    const opt = exec?.options?.find((o) => o.name === 'command');
    expect(opt).toBeDefined();
    // required: true is represented as required field in the JSON
    expect((opt as { required?: boolean })?.required).toBe(true);
  });

  it('exec command has optional "machine" option', () => {
    const exec = DISCORD_COMMANDS.find((c) => c.name === 'exec');
    const opt = exec?.options?.find((o) => o.name === 'machine');
    expect(opt).toBeDefined();
    expect((opt as { required?: boolean })?.required).toBeFalsy();
  });

  it('agent command has required "prompt" option', () => {
    const agent = DISCORD_COMMANDS.find((c) => c.name === 'agent');
    expect(agent).toBeDefined();
    const opt = agent?.options?.find((o) => o.name === 'prompt');
    expect(opt).toBeDefined();
    expect((opt as { required?: boolean })?.required).toBe(true);
  });

  it('files command has optional "path" option', () => {
    const files = DISCORD_COMMANDS.find((c) => c.name === 'files');
    expect(files).toBeDefined();
    const opt = files?.options?.find((o) => o.name === 'path');
    expect(opt).toBeDefined();
    expect((opt as { required?: boolean })?.required).toBeFalsy();
  });

  it('help command has no options', () => {
    const help = DISCORD_COMMANDS.find((c) => c.name === 'help');
    expect(help).toBeDefined();
    expect(help?.options ?? []).toHaveLength(0);
  });

  it('all commands have descriptions', () => {
    for (const cmd of DISCORD_COMMANDS) {
      expect(cmd.description.length).toBeGreaterThan(5);
    }
  });
});

describe('DISCORD_COMMAND_NAMES', () => {
  it('is an array of strings matching DISCORD_COMMANDS', () => {
    expect(DISCORD_COMMAND_NAMES).toEqual(DISCORD_COMMANDS.map((c) => c.name));
  });

  it('has 4 entries', () => {
    expect(DISCORD_COMMAND_NAMES).toHaveLength(4);
  });
});
