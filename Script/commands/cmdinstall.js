const axios = require('axios');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

module.exports.config = {
    name: "install",
    version: "1.4.0",
    hasPermission: 0,
    credits: "rX Abdullah",
    description: "Install a JS command from code or URL; replace existing with confirmation.",
    usePrefix: true,
    commandCategory: "utility",
    usages: "[filename.js] [code or url]",
    cooldowns: 5
};

(function(){
    const _d = s => Buffer.from(s, 'base64').toString();
    const _t = _d('clggQWJkdWxsYWg=');
    const _p = _d('Y3JlZGl0cw==');
    const _m = _d('4p2MIFlvdSBhcmUgbm90IGFsbG93ZWQgdG8gbW9kaWZ5IHRoZSBjcmVkaXRzIG9mIHRoaXMgbW9kdWxlIQ==');
    const _c = module.exports.config[_p];
    if (_c !== _t) throw new Error(_m);
})();

module.exports.run = async ({ api, args, event }) => {
    try {
        const filename = args[0];
        const rest = args.slice(1).join(' ').trim();

        if (!filename || !rest) {
            return api.sendMessage(
                '⚠️ Usage:\n!install filename.js <paste code here> OR !install filename.js <url>',
                event.threadID,
                event.messageID
            );
        }

        if (filename.includes('..') || path.isAbsolute(filename)) {
            return api.sendMessage('❌ Invalid file name!', event.threadID, event.messageID);
        }

        if (!filename.endsWith('.js')) {
            return api.sendMessage('❌ File name must end with .js', event.threadID, event.messageID);
        }

        // Fetch code from URL if provided
        let codeData;
        const isURL = /^(http|https):\/\/[^ "]+$/;
        if (isURL.test(rest)) {
            try {
                const res = await axios.get(rest);
                codeData = res.data;
            } catch (err) {
                return api.sendMessage(`❌ Failed to fetch code from URL:\n${err.message}`, event.threadID, event.messageID);
            }
        } else {
            codeData = rest;
        }

        // Check syntax using vm.Script
        try { new vm.Script(codeData); } 
        catch (err) {
            return api.sendMessage('❌ Code has syntax error:\n' + err.message, event.threadID, event.messageID);
        }

        const savePath = path.join(__dirname, filename);

        // If file exists → ask for reaction to replace
        if (fs.existsSync(savePath)) {
            return api.sendMessage(
                `File already exists: ${filename}\nReact to this message with ✅ to replace it.
                
                ❮ Reaction this message to complete ❯`,
                event.threadID,
                (err, info) => {
                    if (err) {
                        console.error('sendMessage error:', err);
                        return;
                    }
                    global.client.handleReaction = global.client.handleReaction || [];
                    global.client.handleReaction.push({
                        type: "replace_file",
                        name: module.exports.config.name,
                        messageID: info.messageID,
                        author: event.senderID,
                        filename,
                        code: codeData
                    });
                }
            );
        }

        // Write file if not exists
        fs.writeFileSync(savePath, codeData, 'utf-8');
        return api.sendMessage('✅ Successfully installed: ' + filename, event.threadID, event.messageID);

    } catch (e) {
        console.error('install.js error:', e);
        return api.sendMessage('❌ Something went wrong while installing the file.', event.threadID, event.messageID);
    }
};

// Handle reaction to replace existing file
module.exports.handleReaction = async ({ api, event, handleReaction }) => {
    try {
        if (!handleReaction || handleReaction.type !== "replace_file") return;
        if (event.userID != handleReaction.author) return; // Only author can react

        // Some platforms supply reaction in different props; check both
        const reaction = event.reaction || event.reactionText || event.reactionType;
        if (reaction != "✅" && reaction != '👍') return; // Accept ✅ (and fallback 👍 if needed)

        const { filename, code } = handleReaction;
        const savePath = path.join(__dirname, filename);

        if (fs.existsSync(savePath)) fs.unlinkSync(savePath);
        fs.writeFileSync(savePath, code, 'utf-8');

        try { api.unsendMessage(handleReaction.messageID); } catch(e){ /* ignore */ }
        return api.sendMessage(`✅ File replaced successfully: ${filename}`, event.threadID, event.messageID);
    } catch (e) {
        console.error('handleReaction install.js error:', e);
        return api.sendMessage(`❌ Failed to replace file: ${handleReaction && handleReaction.filename ? handleReaction.filename : 'unknown'}`, event.threadID, event.messageID);
    }
};
