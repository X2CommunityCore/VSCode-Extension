# xcom-sdk README

The XCOM SDK extension provides a set of commands to complement / use tools provided by the XCOM SDK.

## Commands

* `XCom-SDK-Create`: choose a modding project template, creates a mod project, opens it in vscode
* `XCom-SDK-CompileScripts`: compile script code using the XCOM editor-enabled executable
* `XCom-SDK-CompileShaders`: compile shaders for materials in your mod's content packages
* `XCom-SDK-Editor`: launch the XCOM editor
* `XCom-SDK-Run`: deploy a mod project to the steam installation directories and run the game in a developer mode to test your mod
* `XCom-SDK-Publish`: create a steam workshop item for your mod, or update an existing workshop item 

## New commands 

* `XCom-SDK-MakeAll`: Executes `make -final_release -full`, usually for making a highlander.
* `XCom-SDK-CookHighlander`: Executes `CookPackages -platform=pcconsole -final_release -quickanddirty -modcook -sha -multilanguagecook=INT+FRA+ITA+DEU+RUS+POL+KOR+ESN -singlethread`, usually after running the above command. This is the second part of highlander cooking. The cooked script packages can be found in `XComGame/Published/CookedPCConsole`.
* `XCom-SDK-CookPackage`: Cooks a specific package that's in `XComGame/Mods/<Workspace>`. The cooked package can be found in `XComGame/CookedPCConsole`.


## Requirements

This extension requires an installation of XCOM Game as well as the XCOM SDK Tool

## Extension Settings

This extension contributes the following settings, which must be set after installing the extension:

* `Paths.GameInstallPath`: location of the XCom game installtion. Example: `C:\Program Files (x86)\Steam\steamapps\common\Dio`
* `Paths.XCOM-SDKInstallPath`: location of the XCom SDK installtion. Example: `C:\Program Files (x86)\Steam\steamapps\common\Dio_SDK`

# Development

To compile and package the extension for VSCode, the following commands need to be ran in order inside the folder with package.json:
* npm install -g vsce
* npm ci
* npm run compile
* vsce package

**Enjoy!**

## Credits

* Firaxis Games - Initial implementation
* E3245 - Coding extra addons
