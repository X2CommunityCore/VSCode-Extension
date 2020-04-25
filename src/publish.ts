/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Firaxis Games. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { workspace, window } from 'vscode';
import * as fs from 'fs';
import { getXComSDKTerminal, getWorkspaceName, copyDirectory } from './xcomsdkutility';

/**
 * Publish the mod using the valve UGC toolkit
 */
export async function publishMod() {
    
    // Build the paths we'll use
    const configuration = vscode.workspace.getConfiguration();
    var sdkPath = configuration.get('conf.Paths.XCOM-SDKInstallPath') as string;
    var workspaceName = getWorkspaceName();
    if( workspaceName === "undefined" )
    {
        window.showInformationMessage(`No workspace loaded, cancelling run`);
        return;
    }
    var pathToModSrcDir = vscode.workspace.rootPath as string;

    var useTerminal: vscode.Terminal = getXComSDKTerminal();
    if( useTerminal )
    {
        useTerminal.show();              
        
        window.showInformationMessage(`Preparing the publishing directory ...`);
        window.showInformationMessage(`(` + pathToModSrcDir + `)`);
        
        // Are there script classes? if so copy the compiled script module
        if( fs.existsSync(pathToModSrcDir + "/Classes") )
        {
            window.showInformationMessage(`Copying compiled script module...`);
            var moduleFilename = workspaceName + ".u";
            try {
                if( !fs.existsSync(pathToModSrcDir +"/Script/") )
                {
                    fs.mkdirSync(pathToModSrcDir +"/Script/");
                }
                await fs.copyFileSync(sdkPath + "/XComGame/Script/" + moduleFilename, pathToModSrcDir +"/Script/" + moduleFilename);
            }
            catch(error) {
                window.showInformationMessage(`FAILED to copy SCRIPT MODULE! Reason: ` + error + ` Check your path user settings the XCOM SDK.`);
                return;
            }
        }

        var modContentDir = sdkPath + "/XComGame/Content/Mods/" + workspaceName;
        if( fs.existsSync(modContentDir) )
        {
            window.showInformationMessage(`Copying content packages...`);            
            try {
                await copyDirectory(modContentDir, pathToModSrcDir + "/Content");
            }
            catch(error) {
                window.showInformationMessage(`FAILED to copy CONTENT PACKAGES! Reason: ` + error + ` Check your path user settings the XCOM SDK.`);
            }
        }

        window.showInformationMessage("Launching Steam publishing command...");

        var publishPath = sdkPath + "/Binaries/Win64/publish/";
        var SetLocationCommand = "cd \"" + publishPath + "\"";
        await useTerminal.sendText(SetLocationCommand, true);
    
        var PublishCommand = ".\\steampublish.exe " + workspaceName;
        await useTerminal.sendText(PublishCommand, true);
    }
}