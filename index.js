const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

function readKeys() {
    try {
        const data = fs.readFileSync('./keys.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

function writeKeys(keys) {
    fs.writeFileSync('./keys.json', JSON.stringify(keys, null, 2));
}

function generateKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `iSyl-${part()}-${part()}-${part()}`;
}

function isAdmin(member) {
    return member.permissions.has(PermissionFlagsBits.Administrator) || 
           (config.adminRoleId && member.roles.cache.has(config.adminRoleId));
}

function getUserKey(keys, discordId) {
    for (const [key, data] of Object.entries(keys)) {
        if (data.discord_id === discordId && data.redeemed) {
            return { key, data };
        }
    }
    return null;
}

async function sendLog(guild, title, description, color = 0xFF0000) {
    try {
        if (!config.logsChannelId) return;
        
        const channel = await guild.channels.fetch(config.logsChannelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending log:', error);
    }
}

client.once('ready', async () => {
    console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
    
    const commands = [
        {
            name: 'genkey',
            description: 'Generate premium keys (Admin only)',
            options: [
                {
                    name: 'amount',
                    description: 'Number of keys to generate',
                    type: 4,
                    required: false
                }
            ]
        },
        {
            name: 'setup',
            description: 'Setup the premium key system panel (Admin only)'
        }
    ];

    try {
        console.log('🔄 Registering slash commands...');
        await client.application.commands.set(commands);
        console.log('✅ Slash commands registered!');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'genkey') {
                if (!isAdmin(interaction.member)) {
                    return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
                }

                const amount = interaction.options.getInteger('amount') || 1;
                
                if (amount < 1 || amount > 50) {
                    return interaction.reply({ content: '❌ Please specify an amount between 1 and 50.', ephemeral: true });
                }

                const keys = readKeys();
                const newKeys = [];

                for (let i = 0; i < amount; i++) {
                    const key = generateKey();
                    keys[key] = {
                        discord_id: '',
                        hwid: '',
                        redeemed: false,
                        reset_hwid: false,
                        created_at: new Date().toISOString()
                    };
                    newKeys.push(key);
                }

                writeKeys(keys);

                const embed = new EmbedBuilder()
                    .setTitle('🔑 Keys Generated Successfully')
                    .setDescription(`Generated **${amount}** new key(s):\n\n${newKeys.map(k => `\`${k}\``).join('\n')}`)
                    .setColor(0xFF0000)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (interaction.commandName === 'setup') {
                if (!isAdmin(interaction.member)) {
                    return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle('🔑 iSylHub Premium Key System')
                    .setDescription('**iSylHub Premium Key System**\n\nGunakan tombol di bawah untuk Redeem Key, ambil Script, Reset HWID, atau Dapatkan Role Premium.')
                    .setColor(0x000000)
                    .setTimestamp();

                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('redeem_key')
                        .setLabel('Redeem Key')
                        .setEmoji('🎟️')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('get_script')
                        .setLabel('Get Script')
                        .setEmoji('📜')
                        .setStyle(ButtonStyle.Primary)
                );

                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('reset_hwid')
                        .setLabel('Reset HWID')
                        .setEmoji('🔄')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('get_role')
                        .setLabel('Get Role')
                        .setEmoji('🎖️')
                        .setStyle(ButtonStyle.Secondary)
                );

                await interaction.reply({ embeds: [embed], components: [row1, row2] });
            }
        }

        if (interaction.isButton()) {
            if (interaction.customId === 'redeem_key') {
                const modal = new ModalBuilder()
                    .setCustomId('redeem_modal')
                    .setTitle('Redeem Premium Key');

                const keyInput = new TextInputBuilder()
                    .setCustomId('key_input')
                    .setLabel('Enter your premium key')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('iSyl-XXXX-XXXX-XXXX')
                    .setRequired(true);

                const row = new ActionRowBuilder().addComponents(keyInput);
                modal.addComponents(row);

                await interaction.showModal(modal);
            }

            if (interaction.customId === 'get_script') {
                const keys = readKeys();
                const userKeyData = getUserKey(keys, interaction.user.id);

                if (!userKeyData) {
                    return interaction.reply({ content: '❌ Kamu belum redeem key.', ephemeral: true });
                }

                try {
                    await interaction.user.send(`✅ **iSylHub Premium Script**\n\n📜 Script URL: ${config.scriptUrl}\n\nGunakan script ini di executor Roblox kamu.`);
                    await interaction.reply({ content: '✅ Script telah dikirim ke DM kamu!', ephemeral: true });
                } catch (error) {
                    await interaction.reply({ content: '❌ Tidak bisa mengirim DM. Pastikan DM kamu terbuka!', ephemeral: true });
                }
            }

            if (interaction.customId === 'reset_hwid') {
                const keys = readKeys();
                const userKeyData = getUserKey(keys, interaction.user.id);

                if (!userKeyData) {
                    return interaction.reply({ content: '❌ Kamu belum redeem key.', ephemeral: true });
                }

                keys[userKeyData.key].reset_hwid = true;
                keys[userKeyData.key].hwid = '';
                writeKeys(keys);

                try {
                    await interaction.user.send('🔄 **HWID Reset**\n\nHWID kamu telah direset. Silakan login ulang di Roblox.');
                } catch (error) {
                    console.error('Error sending DM:', error);
                }

                await interaction.reply({ content: '✅ HWID berhasil direset!', ephemeral: true });

                await sendLog(
                    interaction.guild,
                    '🔁 HWID Reset',
                    `**User:** <@${interaction.user.id}>\n**Key:** \`${userKeyData.key}\``,
                    0xFFA500
                );
            }

            if (interaction.customId === 'get_role') {
                const keys = readKeys();
                const userKeyData = getUserKey(keys, interaction.user.id);

                if (!userKeyData) {
                    return interaction.reply({ content: '❌ Kamu belum redeem key.', ephemeral: true });
                }

                if (!config.premiumRoleId) {
                    return interaction.reply({ content: '❌ Premium role belum dikonfigurasi.', ephemeral: true });
                }

                try {
                    const role = await interaction.guild.roles.fetch(config.premiumRoleId);
                    if (!role) {
                        return interaction.reply({ content: '❌ Premium role tidak ditemukan.', ephemeral: true });
                    }

                    if (interaction.member.roles.cache.has(config.premiumRoleId)) {
                        return interaction.reply({ content: '✅ Kamu sudah memiliki role Premium!', ephemeral: true });
                    }

                    await interaction.member.roles.add(role);
                    await interaction.reply({ content: '✅ Role Premium berhasil ditambahkan.', ephemeral: true });

                    await sendLog(
                        interaction.guild,
                        '🎖️ Role Granted',
                        `**User:** <@${interaction.user.id}>\n**Role:** ${role.name}\n**Key:** \`${userKeyData.key}\``,
                        0x00FF00
                    );
                } catch (error) {
                    console.error('Error adding role:', error);
                    await interaction.reply({ content: '❌ Terjadi error saat menambahkan role.', ephemeral: true });
                }
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'redeem_modal') {
                const keyInput = interaction.fields.getTextInputValue('key_input').trim();
                const keys = readKeys();

                if (!keys[keyInput]) {
                    return interaction.reply({ content: '❌ Key tidak valid!', ephemeral: true });
                }

                if (keys[keyInput].redeemed) {
                    return interaction.reply({ content: '❌ Key sudah pernah digunakan!', ephemeral: true });
                }

                const userKeyData = getUserKey(keys, interaction.user.id);
                if (userKeyData) {
                    return interaction.reply({ content: '❌ Kamu sudah redeem key sebelumnya!', ephemeral: true });
                }

                keys[keyInput].redeemed = true;
                keys[keyInput].discord_id = interaction.user.id;
                writeKeys(keys);

                await interaction.reply({ content: '✅ Key berhasil di-redeem! Sekarang kamu bisa menggunakan fitur Premium.', ephemeral: true });

                await sendLog(
                    interaction.guild,
                    '✅ Key Redeemed',
                    `**User:** <@${interaction.user.id}>\n**Key:** \`${keyInput}\``,
                    0x00FF00
                );
            }
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Terjadi error saat memproses request.', ephemeral: true }).catch(console.error);
        }
    }
});

client.login(DISCORD_TOKEN);
