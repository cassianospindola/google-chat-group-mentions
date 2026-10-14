# google-chat-group-mentions

[Português](#português) | [English](#english)

---

## Português

O Google Chat não deixa mencionar um Google Group, só pessoa por pessoa. Esta skill ensina o Claude a construir com você um bot em Apps Script que resolve isso. Você escreve `@mention financeiro sua mensagem` e o bot menciona, na mesma thread, cada membro de `financeiro@seudominio`.

**O que o bot faz**
- Lê os Google Groups do Workspace a cada hora, inclusive grupos aninhados.
- Menciona um ou vários grupos de uma vez (`@mention financeiro,suporte`), sem repetir pessoas.
- Permite que cada pessoa deixe de ser mencionada por um grupo (`silenciar grupo`).
- Responde em português ou inglês e aceita comandos nos dois idiomas.

**O que vem na skill**
- Código completo em Apps Script e manifesto com os escopos mínimos.
- Passo a passo de configuração no Apps Script e no Google Cloud.
- As armadilhas já encontradas, com sintoma, causa e correção.
- Os riscos que você precisa conhecer antes de colocar em uso.

**Pré-requisitos:** papel de Groups Admin no Workspace e um projeto do Google Cloud dentro da organização do Workspace.

As instruções da skill estão em inglês. O Claude conversa com você no seu idioma.

---

## English

Google Chat cannot mention a Google Group, only people one by one. This skill teaches Claude to build, with you, an Apps Script bot that fixes it. You write `@mention finance your message` and the bot mentions, in the same thread, every member of `finance@yourdomain`.

**What the bot does**
- Reads the Workspace Google Groups every hour, nested groups included.
- Mentions one or several groups at once (`@mention finance,support`), without repeating people.
- Lets each person opt out of a group's mentions (`mute group`).
- Replies in English or Portuguese and accepts commands in both.

**What the skill includes**
- Complete Apps Script code and a manifest with the minimum scopes.
- Step-by-step setup in Apps Script and Google Cloud.
- Known pitfalls, with symptom, cause and fix.
- The risks you need to know before rollout.

**Prerequisites:** Groups Admin role in Workspace and a Google Cloud project inside the Workspace organization.

---

## Install

**Claude Code, as a plugin**
```
/plugin marketplace add cassianospindola/google-chat-group-mentions
/plugin install google-chat-group-mentions@google-chat-group-mentions
```

**Claude Code, copying the skill**
```
git clone https://github.com/cassianospindola/google-chat-group-mentions
cp -r google-chat-group-mentions/plugins/google-chat-group-mentions/skills/google-chat-group-mentions ~/.claude/skills/
```
Use `.claude/skills/` inside a project instead of `~/.claude/skills/` to scope it to that project.

**Claude.ai**
Zip the folder `plugins/google-chat-group-mentions/skills/google-chat-group-mentions` and upload it in Settings > Capabilities > Skills > Upload skill. Code execution must be enabled.

## Repository layout
```
.claude-plugin/marketplace.json
plugins/google-chat-group-mentions/
  .claude-plugin/plugin.json
  skills/google-chat-group-mentions/
    SKILL.md
    assets/Code.gs
    assets/appsscript.json
    references/setup.md
    references/pitfalls.md
    references/risks.md
```

## License
MIT. See [LICENSE](LICENSE).
