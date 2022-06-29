/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Firaxis Games. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { window, workspace, Uri, commands, WorkspaceFolder } from 'vscode';
import { posix } from 'path';
import { TextEncoder, TextDecoder } from 'util';
import * as fs from 'fs';

/**
 * Sleep function
 */
export function delay(ms: number) 
{
    return new Promise( resolve => setTimeout(resolve, ms) );
}

export async function copyDirectory(source: string, destination: string)
{    
    if( !fs.existsSync(destination) )
    {
        fs.mkdirSync(destination);
    }
	
    // Declare fs-ext
    const fs_ext = require('fs-extra');

    for (const [name, type] of await workspace.fs.readDirectory( vscode.Uri.file(source) ))
    {
        if( type === vscode.FileType.File )
        {
            //perform the copy
            var From = source + "/" + name;
            var To = destination + "/" + name;
            fs.copyFileSync(From, To);
        }
        // Standard copyfilesync doesn't copy recurisvely
        else if( type === vscode.FileType.Directory )
        {

            //perform the copy
            fs_ext.copy(source, destination);
        }
    }
}

export async function moveDirectory(source: string, destination: string)
{    
    for (const [name, type] of await workspace.fs.readDirectory( vscode.Uri.file(source) ))
    {
        if( type === vscode.FileType.File )
        {
            //perform the copy
            var From = source + "/" + name;
            var To = destination + "/" + name;
            fs.renameSync(From, To);
        }
    }
}

/**
 * Fetch or create a terminal for the SDK tools to use
 */
export function getXComSDKTerminal(): vscode.Terminal
{
    // Find an existing terminal if possible
    var useTerminal: vscode.Terminal;
    var useTerminalIndex:number = -1;
    for( var index:number = 0; index < vscode.window.terminals.length; ++index )
    {        
        if (vscode.window.terminals[index].name === `XCom-SDK Terminal`)
        {
            useTerminalIndex = index;  
            break;          
        }
    }

    // Create a new terminal if needed
    if( useTerminalIndex < 0 )
    {
        useTerminalIndex = vscode.window.terminals.length;
        vscode.window.createTerminal('XCom-SDK Terminal');
    }

    var useTerminal = vscode.window.terminals[useTerminalIndex];
    return useTerminal;
}

/**
 * Analyze the included folders to try and get a name for our workspace
 */
export function getWorkspaceName(): string
{
    var file = workspace.workspaceFile;
    if( file )
    {
        var filename = file.fsPath.replace(/^.*[\\\/]/, '').split('.')[0];
        return filename;
    }
    
    return "undefined";
}

/**
 * buildInternal() copied from Build.ts, changes path to the SDK path and executes any command to the XComGame.exe
 */
export async function executeCommandlet(command: string)
{
    // Fetch the path to the templates
    const configuration = vscode.workspace.getConfiguration();
    var stdPathStr = configuration.get('conf.Paths.XCOM-SDKInstallPath') as string;
    var pathStr = stdPathStr + "/Binaries/Win64/";    
    
    // Run the make command within the terminal
    var useTerminal: vscode.Terminal = getXComSDKTerminal();
    if( useTerminal )
    {
        //Force focus on the XCOM SDK terminal        
        useTerminal.show();
           
        var SetLocationCommand = "cd \"" + pathStr + "\"";
        await useTerminal.sendText(SetLocationCommand, true);
    
        var BuildCommand = ".\\XComGame.com " + command;
        await useTerminal.sendText(BuildCommand, true);
    }
}

/**
 * Decode entire file by finding first index of `+NonNativePackages=`, and last index of the last possible line
 */
export async function getScriptPackageNames() : Promise<string[]>
{
	var ScriptPackages: string[] = [];
	
	return await vscode.workspace.findFiles('**/XComEngine.ini', '/node_modules/', 5).then((uris: vscode.Uri[] ) => {
		let firstindex = -1;
		let dec = new TextDecoder();
		let data = null;
		let fileString = new String();
			
		// Set our findString to [Engine.ScriptPackages]
		const findString = "+NonNativePackages=";
		
		for (let i = 0; i < uris.length; ++i)
		{
			// Read the ini file as a bytearray
			data = fs.readFileSync(uris[i].fsPath);
			
			// Decode into string
			fileString = dec.decode(data);
			
			// Get the first index of in the fileBuffer
			firstindex = fileString.indexOf(findString);
			
			if (firstindex > -1)
				break;		
		}
		
		if (firstindex <= -1)
		{
			ScriptPackages.push(getWorkspaceName());
			return ScriptPackages;
		}

		const lastindex = fileString.lastIndexOf(findString);
		let k = lastindex+19;
		
		// From last index, determine endpoint
		for (let j = k; j < fileString.length; j++)
		{
			// Break on the first newline, space, or comment
			if (fileString[j] == "\\n" || fileString[j] == ";" || fileString[j] == " " || fileString[j] == "[")
				break;
			k++;
		}
			
		// Slice then split the string
		ScriptPackages = fileString.slice(firstindex, k).split(findString, 255);
		
		// Remove any newlines
		for (let j = 0; j < ScriptPackages.length; ++j)
		{
			ScriptPackages[j] = ScriptPackages[j].replace(/(\r\n|\n|\r)/gm, "");
		}
		
		return ScriptPackages;
	});
}

export async function DeleteAllScriptsInDirectory(path : string)
{
	await fs.readdir(path, (err, files) => 
	{
		for (let i = 0; i < files.length; i++)
		{
			// These files must not be deleted for any reason!
			if (files[i].toUpperCase() == "MANIFEST.TXT" || files[i].toUpperCase() == "DO_NOT_DELETE.TXT")
				continue;
			
			fs.unlinkSync(path + files[i]);
		};
	});
}

export async function DeleteSpecificScriptFiles(path : string)
{
	let ScriptPackageNames =  await getScriptPackageNames();
	
	let moduleFilename = "";
	
	for (let i = 0; i < ScriptPackageNames.length; i++)
	{
		if (ScriptPackageNames[i] == null)
			continue;

		moduleFilename = path + ScriptPackageNames[i] + ".u";
		
		if( fs.existsSync(moduleFilename) )
		{
			fs.unlinkSync(moduleFilename);
		}
	}
}