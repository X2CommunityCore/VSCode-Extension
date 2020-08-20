/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Firaxis Games. All rights reserved.
 *--------------------------------------------------------------------------------------------
 
 Separate script as to not touch the build.ts scripts
 By: E3245
 */
import * as vscode from 'vscode';
import { window, workspace, Uri, commands } from 'vscode';
import * as fs from 'fs';
import { getXComSDKTerminal, getWorkspaceName, delay, executeCommandlet } from './xcomsdkutility';
import { TextEncoder, TextDecoder } from 'util';

/**
 * Compile all scripts into the final_release folder.
 */
export async function compileMakeAll() {
    executeCommandlet('make -final_release -full');
}

/**
 * Cook all script UPKs
 */
export async function cookHighlander() 
{
    //Get the path to the SDK's XComEngine.ini
    const configuration = vscode.workspace.getConfiguration();
    var sdkPath = configuration.get('conf.Paths.XCOM-SDKInstallPath') as string;
    var EngineIniPath = sdkPath + "/XComGame/Config/XComEngine.ini";

    //We need to edit the XComEngine.ini file to make sure UseTextureCache equals TRUE    
    editIniFile(vscode.Uri.file(EngineIniPath),"UseTextureFileCache=","TRUE");

    //Execute build commandlet
    executeCommandlet('make -final_release -full');
}

/**
 * Compile all scripts into the final_release folder.
 */
export async function cookPackage() {

    const configuration = vscode.workspace.getConfiguration();
    var stdPathStr = configuration.get('conf.Paths.XCOM-SDKInstallPath') as string;
    var pathStr = stdPathStr + "/XcomGame/Content/Mods/"+ getWorkspaceName();
    let pathUri = vscode.Uri.file(pathStr);
        
    // Iterate the available upks
    let OptionNames: Array<string> = [];
    //let OptionPaths: Array<Uri> = [];

    for (const [name, type] of await workspace.fs.readDirectory( pathUri )) 
    {
        if (type === vscode.FileType.File)
        {
            // Do some additional filtering, check if the extension is a UPK
            var test = name.split(".");

            // Check if the second string has a UPK extension, does not include "_ModShaderCache", and does not include "_SF" (Seekfree).
            // Add it to the possible list of options to choose from
            if  (    test[1].toUpperCase() === "UPK" && 
                    !(test[0].includes("_ModShaderCache")) &&
                    !(test[0].includes("_SF"))
                )
            {
                OptionNames.push(name);
            }
        }
    }

    if (OptionNames === undefined || OptionNames.length === 0)
    {
        window.showInformationMessage(`No UPKs found, cancelling cook...`);
        return;        
    }

    // Prompt the user to pick whatever upk file currently in 
    const selectedUPK = await window.showQuickPick(OptionNames, {
		placeHolder: 'Select UPK file to cook'               
	});        
    let templateIndex = OptionNames.indexOf(selectedUPK as string);
    
    if( templateIndex < 0 )
    {
        window.showInformationMessage(`Did not select a UPK, cancelling cook...`);
        return;
    }
    else
    {
        window.showInformationMessage(`Selected to cook: ${selectedUPK}`);
    }

    //We need to edit the XComEngine.ini file to make sure UseTextureCache equals FALSE or the cook will fail or cause corrupt textures when put in game  
    var sdkPath = configuration.get('conf.Paths.XCOM-SDKInstallPath') as string;
    var EngineIniPath = sdkPath + "/XComGame/Config/XComEngine.ini";
    editIniFile(vscode.Uri.file(EngineIniPath),"UseTextureFileCache=","FALSE");

    //Execute commandlet
    executeCommandlet(`CookPackages ${selectedUPK} -platform=pcconsole -skipmaps -fastcook -usermode`);   
}

/**
 * Function that edits any ini file, given a key and value.
 * A return type is not expected here unless it's for error checking.
 */
async function editIniFile(iniFilePath: Uri, key: string, value: string)
{
    var workspaceName = getWorkspaceName();

    fs.readFile(iniFilePath.fsPath, function (err, byteArray)
    {
        // Convert to string, replace
        var dec = new TextDecoder();
        var file = dec.decode(byteArray);
        
        // The key has to exist or else this will fail
        if( file.indexOf(key) < 0)
        {
            //Error out because this cannot happen unless the user has removed the entry
            window.showInformationMessage(`ERROR: ${key} in XComEngine.ini was not found! Please add it back in before trying again!`);
            return;            
        }

        // Encode and write back (UTF-8)
        var enc = new TextEncoder();
        vscode.workspace.fs.writeFile(iniFilePath, enc.encode(`${key}${value}`));
    });
}