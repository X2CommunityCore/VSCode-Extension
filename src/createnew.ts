/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Firaxis Games. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { window, workspace, Uri, commands } from 'vscode';
import { posix } from 'path';
import * as fs from 'fs';
import * as chokidar from 'chokidar';
import { TextEncoder, TextDecoder } from 'util';
import { getXComSDKTerminal, delay, moveDirectory } from './xcomsdkutility';


/**
 * Recurse into the directory structure, scanning files and updating as needed
 */

async function gatherModFiles(searchPath: Uri, filesList :string[], pathsList :string[])
{
    for (const [name, type] of await workspace.fs.readDirectory( searchPath ))
    {
        if (type === vscode.FileType.Directory)
        {            
            await gatherModFiles(vscode.Uri.file(posix.join(searchPath.path, name)), filesList, pathsList);
        }
        else if(type === vscode.FileType.File)
        {
            filesList.push(name);
            pathsList.push(searchPath.fsPath.toString() + "\\");
        }
    }
}

async function updateModFile(searchPath: string, name : string, replacement : string)
{   
    var isLocalizedTextFile: boolean =  name.indexOf(".chn") > -1 || name.indexOf(".cht") > -1 || 
                                        name.indexOf(".deu") > -1 || name.indexOf(".esn") > -1 || 
                                        name.indexOf(".fra") > -1 || name.indexOf(".int") > -1 || 
                                        name.indexOf(".ita") > -1 || name.indexOf(".jpn") > -1 || 
                                        name.indexOf(".kor") > -1 || name.indexOf(".pol") > -1 || 
                                        name.indexOf(".rus") > -1 || name.indexOf(".xxx") > -1;

    // The first branch handles file renaming, and text replacements for text formatted files
    // Second handles file renaming, copying of binary files
    if( isLocalizedTextFile ||
        name.indexOf(".uc") > -1 ||
        name.indexOf(".ini") > -1 ||
        name.indexOf(".md") > -1 ||
        name.indexOf(".json") > -1 ||
        name.indexOf(".XComMod") > -1 ||
        name.indexOf(".code-workspace") > -1)
    {
        
        vscode.workspace.fs.readFile(vscode.Uri.file(posix.join(searchPath, name))).then((byteArray) => 
        {                    
            var dec = new TextDecoder();
            var fileString = dec.decode(byteArray);

            // Replace mod name in the file text
            fileString = fileString.split('$ModSafeName$').join(replacement);
            
            // Replace SDK paths in the file text
            const configuration = vscode.workspace.getConfiguration();
            var pathStr = configuration.get('conf.Paths.XCOM-SDKInstallPath') as string;
            let re = /\\/gi;
            pathStr = pathStr.replace(re, "/");
            fileString = fileString.split('$REPLACESDKPATH$').join(pathStr);
            
            // Replace the template named file names if needed
            var itPath = vscode.Uri.file(posix.join(searchPath, name));
            if( name.indexOf("TemplateReplace") > -1 )
            {
                var newFileName = name.replace("TemplateReplace", replacement);
                vscode.workspace.fs.delete(itPath);
                itPath = vscode.Uri.file(posix.join(searchPath, newFileName));
            }

            // Encode and write back
            if( isLocalizedTextFile ) 
            {
                //UE3 localization files are UCS-2 LE BOM
                vscode.workspace.fs.writeFile(itPath, require('punycode').ucs2.encode(fileString));
            }
            else 
            {
                //UTF-8
                var enc = new TextEncoder();
                vscode.workspace.fs.writeFile(itPath, enc.encode(fileString));
            }
        });
    }
    else
    {
        // Replace the template named file names if needed
        var itPath = vscode.Uri.file(posix.join(searchPath, name));
        if( name.indexOf("TemplateReplace") > -1 )
        {
            var newFileName = name.replace("TemplateReplace", replacement);
            var altPath = vscode.Uri.file(posix.join(searchPath, newFileName));
            await vscode.workspace.fs.copy(itPath, altPath);
            await vscode.workspace.fs.delete(itPath);
        }
    }
}

/**
 * Prompts the user for inputs needed to create a new XCOM mod, then creates
 * a project for the mod
 */
export async function showCreateMenu() {
    
    // Fetch the path to the templates
    const configuration = vscode.workspace.getConfiguration();
    var stdPathStr = configuration.get('conf.Paths.XCOM-SDKInstallPath') as string;
    var pathStr = stdPathStr + "/Development/Templates/";
    let pathUri = vscode.Uri.file(pathStr);
        
    // Iterate the available templates
    let OptionNames: Array<string> = [];
    let OptionPaths: Array<Uri> = [];
    for (const [name, type] of await workspace.fs.readDirectory( pathUri )) 
    {
        if (type === vscode.FileType.Directory)
        {
            OptionNames.push(name);
            OptionPaths.push(vscode.Uri.file(posix.join(pathUri.path, name)));
        }
    }

    // Prompt the user to pick a template
    let i = 0;
	const result = await window.showQuickPick(OptionNames, {
		placeHolder: 'Select an XCom mod project template'               
	});        
    let templateIndex = OptionNames.indexOf(result as string);
    
    if( templateIndex < 0 )
    {
        window.showInformationMessage(`Did not select a template, cancelling create...`);
        return;
    }
    else
    {
        window.showInformationMessage(`Selected: ${result}`);
    }

    // Prompt the user to name their mod
    const resultName = await window.showInputBox({
		value: 'MyModName',
		placeHolder: 'Enter a name ( use file system valid characters ) for your mod',
		validateInput: text => {
            var hasMatch = text.match(/^[a-zA-Z0-9_-]+$/i);
            //window.showInformationMessage(`Testing ` + text + ` ... determined: ` + hasMatch);
            if( !hasMatch )
            {
                return "Invalid name";
            }

            // Check for a name collision with existing
            var checkPathToMod = stdPathStr + "/Development/Src/" + text;
            if( fs.existsSync(checkPathToMod) )
            {
                return "Invalid, already exists";
            }

			return undefined; //looks OK
		}
    });
        
    if( !resultName )
    {
        window.showInformationMessage(`Did not provide a valid mod name, cancelling create...`);
        return;
    }
    else
    {
        window.showInformationMessage(`Using name: ${resultName}`);
    }

    // With the information on the template selection and name, copy the mod template over to the working area
    var pathToMod = stdPathStr + "/Development/Src/" + (resultName as string);

    // Make the directory and start watching it to see when robocopy stops making changes
    fs.mkdirSync(pathToMod);
    var bDoneCopying = false;
    var timeSinceLastChange = 0;
    var watchHandle = chokidar.watch(pathToMod).on('all', (event: string, path: string) => {
        //window.showInformationMessage(event + " : " + path);
        timeSinceLastChange = 0;
    });

    window.showInformationMessage("Preparing your workspace ...");
    var useTerminal: vscode.Terminal = getXComSDKTerminal();
    if( useTerminal )
    {
        useTerminal.show();        
        var command = "robocopy \"" + OptionPaths[templateIndex].fsPath + "\" \"" + pathToMod + "\" /MIR";
        await useTerminal.sendText(command, true);

        var clearReadOnly = "attrib -r \"" + pathToMod + "\\*.*\" /s";
        await useTerminal.sendText(clearReadOnly, true);
    }

    var WaitingSeconds = 0.0;
    while(!bDoneCopying && WaitingSeconds < 120.0) //Expect to be done in 120 seconds even on the slowest systems
    {
        await delay(100);
        WaitingSeconds += 0.1;

        if( timeSinceLastChange > 10 )
        {
            bDoneCopying = true;
        }
        
        timeSinceLastChange += 1;
    }
    watchHandle.close();
    window.showInformationMessage("Workspace copy done, updating template files ...");

    for (const [name, type] of await workspace.fs.readDirectory( pathUri ))
    {
        if (type === vscode.FileType.File)
        {
            OptionNames.push(name);
            OptionPaths.push(vscode.Uri.file(posix.join(pathUri.path, name)));
        }
    }
    let uri = Uri.file(pathToMod);

    // Update the mod files
    var fileList : string[] = new Array();    
    var pathsList : string[] = new Array();    
    await gatherModFiles(uri, fileList, pathsList);
    for( var index = 0; index < fileList.length; ++index )
    {
        await updateModFile(pathsList[index], fileList[index], (resultName as string));
    }

    // Copy content files to their spot, if there are any
    var contentSource = pathToMod + "/Content";
    if( fs.existsSync(contentSource) )
    {
        window.showInformationMessage("Copying content files ...");
        var contentDir = stdPathStr + "/XComGame/Content/Mods/";

        // Create the base dir if needed
        if( !fs.existsSync(contentDir) )
        {
            fs.mkdirSync(contentDir);
        }
        
        // Create the mod's dir
        contentDir += (resultName as string);
        if( !fs.existsSync(contentDir) )
        {
            fs.mkdirSync(contentDir);
        }

        // Move the content files
        await moveDirectory(contentSource, contentDir);

        // Delete the source content dir
        fs.rmdirSync(contentSource);
    }

    window.showInformationMessage("Workspace is ready, please select 'open' when prompted");

    await delay(1000);

    let workspaceURI = Uri.file(pathToMod + "/" + (resultName as string) + ".code-workspace");
    let success = await commands.executeCommand('vscode.openFolder', uri);
}
