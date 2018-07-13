const {window, workspace, commands} = require('vscode');
const fs = require('fs');
const path = require('path');
const {compile} = require('sleet');

const hasCompiledFile = (file) => {
    const dir = path.dirname(file);
    const filename = path.basename(file);
    const name = path.basename(file, path.extname(file));
    return fs.readdirSync(dir).filter(f => f !== filename && path.basename(f, path.extname(f)) === name).length !== 0;
};
const getPackageConfig = (file) => {
    let root = path.resolve(path.dirname(file));

    while (path.dirname(root) !== root) {
        const pkg = path.join(root, 'package.json');
        if (fs.existsSync(pkg)) {
            try {
                const obj = JSON.parse(fs.readFileSync(pkg));
                if (obj.sleet) return obj.sleet;
            } catch (e) {
                // ignore
            }
        }
        root = path.dirname(root);
    }
    return null;
};
const compileIt = (content, file) => {
    const options = getPackageConfig(file) || {};
    options.filename = file;
    try {
        return compile(content, options);
    } catch (e) {
        window.setStatusBarMessage(e.message, 10000)
        window.showErrorMessage(e.message)
        throw e
    }
};

let doCompile = (document, force) => {
    if (document.languageId !== 'sleet') return;

    const file = document.fileName;
    if (!force && !hasCompiledFile(file)) return;

    const compiled = compileIt(document.getText(), file);

    const target = `${path.join(path.dirname(file), path.basename(file, path.extname(file)))}.${compiled.extension}`;
    fs.writeFileSync(target, compiled.content, 'utf-8');
};

function activate(context) {
    context.subscriptions.push(workspace.onDidChangeTextDocument((e) => {
        compileIt(e.document.getText(), e.document.fileName);
    }));
    context.subscriptions.push(workspace.onDidSaveTextDocument((e) => {
        doCompile(e);
    }));

    let disposable = commands.registerCommand('extension.sleet.compile', () => {
        let editor = window.activeTextEditor;
        if (!editor || !editor.document) return;

        doCompile(editor.document, true);
    });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

exports.deactivate = function() {};
