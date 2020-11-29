// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { showCreateMenu } from './createnew';
import { buildScripts, buildShaderCache } from './build';
import { runMod, runEditor } from './run';
import { publishMod } from './publish';
import { compileMakeAll, cookHighlander, cookPackage } from './highlander';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('The extension "xcom-sdk" is now active!');

	let createnewDisposable = vscode.commands.registerCommand('extension.xcom-createnew', () => {		
		showCreateMenu();
	});
	context.subscriptions.push(createnewDisposable);

	let makeDisposable = vscode.commands.registerCommand('extension.xcom-make', () => {		
		buildScripts();
	});
	context.subscriptions.push(makeDisposable);	

	let compileShadersDisposable = vscode.commands.registerCommand('extension.xcom-compileshaders', () => {		
		buildShaderCache();
	});
	context.subscriptions.push(compileShadersDisposable);	

	let runEditorDisposable = vscode.commands.registerCommand('extension.xcom-editor', () => {		
		runEditor();
	});
	context.subscriptions.push(runEditorDisposable);

	let runDisposable = vscode.commands.registerCommand('extension.xcom-run', () => {		
		runMod();
	});
	context.subscriptions.push(runDisposable);

	let publishDisposable = vscode.commands.registerCommand('extension.xcom-publish', () => {		
		publishMod();
	});
	context.subscriptions.push(publishDisposable);

	//E3245: Additonal Commands
	//E3245: Additonal Commands
	let nakeAllDisposable = vscode.commands.registerCommand('extension.xcom-makeall', () => {		
		compileMakeAll();
	});
	context.subscriptions.push(nakeAllDisposable);

	let cookhighlanderDisposable = vscode.commands.registerCommand('extension.xcom-cookhighlander', () => {		
		cookHighlander();
	});
	context.subscriptions.push(cookhighlanderDisposable);

	let cookPackagesDisposable = vscode.commands.registerCommand('extension.xcom-cookpackage', () => {		
		cookPackage();
	});
	context.subscriptions.push(cookPackagesDisposable);

}

// this method is called when your extension is deactivated
export function deactivate() {}
