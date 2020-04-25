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

    for (const [name, type] of await workspace.fs.readDirectory( vscode.Uri.file(source) ))
    {
        if( type === vscode.FileType.File )
        {
            //perform the copy
            var From = source + "/" + name;
            var To = destination + "/" + name;
            fs.copyFileSync(From, To);
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
