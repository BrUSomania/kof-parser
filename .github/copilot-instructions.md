<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->
- [ ] Verify that the copilot-instructions.md file in the .github directory is created.

- [ ] Clarify Project Requirements
	<!-- Ask for project type, language, and frameworks if not specified. Skip if already provided. -->

- [ ] Scaffold the Project
	<!--
	Ensure that the previous step has been marked as completed.
	Call project setup tool with projectType parameter.
	Run scaffolding command to create project files and folders.
	Use '.' as the working directory.
	If no appropriate projectType is available, search documentation using available tools.
	Otherwise, create the project structure manually using available file creation tools.
	-->

- [ ] Customize the Project
	<!--
	Verify that all previous steps have been completed successfully and you have marked the step as completed.
	Develop a plan to modify codebase according to user requirements.
	Apply modifications using appropriate tools and user-provided references.
	Skip this step for "Hello World" projects.
	-->

- [ ] Install Required Extensions
	<!-- ONLY install extensions provided mentioned in the get_project_setup_info. Skip this step otherwise and mark as completed. -->

- [ ] Compile the Project
	<!--
	Verify that all previous steps have been completed.
	Install any missing dependencies.
	Run diagnostics and resolve any issues.
	Check for markdown files in project folder for relevant instructions on how to do this.
	-->

- [ ] Create and Run Task
	<!--
	Verify that all previous steps have been completed.
	Check https://code.visualstudio.com/docs/debugtest/tasks to determine if the project needs a task. If so, use the create_and_run_task to create and launch a task based on package.json, README.md, and project structure.
	Skip this step otherwise.
	 -->

- [ ] Launch the Project
	<!--
	Verify that all previous steps have been completed.
	Prompt user for debug mode, launch only if confirmed.
	 -->


	- Example KOF files for testing are in `demo/kof_files`.
	- The data columns in a KOF file are defined by a header string:
	  `-05 PPPPPPPPPP KKKKKKKK XXXXXXXX.XXX YYYYYYY.YYY ZZZZ.ZZZ`
	  - `05`: row code (required)
	  - `PPPPPPPPPP`: observation/point name (optional)
	  - `KKKKKKKK`: code of the observation/point (optional)
	  - `XXXXXXXX.XXX`: northing/latitude (required for observations)
	  - `YYYYYYY.YYY`: easting/longitude (required for observations)
	  - `ZZZZ.ZZZ`: elevation (optional, set to -500 if not found)
	  - Other columns after elevation are allowed and should be parsed if present.
	- Points are single `05` rows. Lines and polygons start with `91` (e.g. `09_91`), have one or more `05` rows, and end with `99` (lines) or `96` (polygons).
	- See README.md for more details and examples.

- [ ] KOF Row Handling and Testing Context
	- Tests should read all KOF files in `demo/kof_files`.
	- Some demo KOF files are intentionally malformed:
	  - Try to repair rows if possible. If a row is repaired, add it with a warning (include row/object id).
	  - Rows that cannot be repaired should be ignored and a warning/error added.
	  - Rows starting with `-` are ignored. Add warnings for these rows. Consecutive `-` rows can be grouped in a single warning (e.g. "KOF lines X to Y ignored").
	  - Empty rows are ignored (including trailing newlines).
	- Parsing should continue through the file regardless of errors.

<!--
## Execution Guidelines
PROGRESS TRACKING:
- If any tools are available to manage the above todo list, use it to track progress through this checklist.
- After completing each step, mark it complete and add a summary.
- Read current todo list status before starting each new step.

COMMUNICATION RULES:
- Avoid verbose explanations or printing full command outputs.
- If a step is skipped, state that briefly (e.g. "No extensions needed").
- Do not explain project structure unless asked.
- Keep explanations concise and focused.

DEVELOPMENT RULES:
- Use '.' as the working directory unless user specifies otherwise.
- Avoid adding media or external links unless explicitly requested.
- Use placeholders only with a note that they should be replaced.
- Use VS Code API tool only for VS Code extension projects.
- Once the project is created, it is already opened in Visual Studio Code—do not suggest commands to open this project in Visual Studio again.
- If the project setup information has additional rules, follow them strictly.

FOLDER CREATION RULES:
- Always use the current directory as the project root.
- If you are running any terminal commands, use the '.' argument to ensure that the current working directory is used ALWAYS.
- Do not create a new folder unless the user explicitly requests it besides a .vscode folder for a tasks.json file.
- If any of the scaffolding commands mention that the folder name is not correct, let the user know to create a new folder with the correct name and then reopen it again in vscode.

EXTENSION INSTALLATION RULES:
- Only install extension specified by the get_project_setup_info tool. DO NOT INSTALL any other extensions.

PROJECT CONTENT RULES:
- If the user has not specified project details, assume they want a "Hello World" project as a starting point.
- Avoid adding links of any type (URLs, files, folders, etc.) or integrations that are not explicitly required.
- Avoid generating images, videos, or any other media files unless explicitly requested.
- If you need to use any media assets as placeholders, let the user know that these are placeholders and should be replaced with the actual assets later.
- Ensure all generated components serve a clear purpose within the user's requested workflow.
- If a feature is assumed but not confirmed, prompt the user for clarification before including it.
- If you are working on a VS Code extension, use the VS Code API tool with a query to find relevant VS Code API references and samples related to that query.

TASK COMPLETION RULES:
- Your task is complete when:
  - Project is successfully scaffolded and compiled without errors
  - copilot-instructions.md file in the .github directory exists in the project
  - README.md file exists and is up to date
  - User is provided with clear instructions to debug/launch the project

Before starting a new task in the above plan, update progress in the plan.
-->
- Work through each checklist item systematically.
- Keep communication concise and focused.
- Follow development best practices.

## Summary of findings (added by assistant)

- The parser now extracts points, lines and polygons from demo KOF files and attaches name/code as metadata.
- Coordinates are parsed and stored into geometry objects as (easting, northing, elevation).
- Parsing uses a columns-first approach (README widths) and robust token-based fallbacks. Each parsed row includes a `strategy` diagnostic indicating which heuristic succeeded (e.g., `columns`, `tokens-end-3`, `decimal-scan`, `large-first`).
- Grouping of 05 rows into 09-start/99-end (linestring) and 09-start/96-end (polygon) is implemented and tested on demo files.
- Many malformed or irregular rows exist in the demo data; heuristics reduce mis-parses but a few rows still mix name/code with numeric tokens. Diagnostics help triage these cases.

## Recommendations / Next steps

- Detect and honor a file-level KOF header (the `-05 PPPPPPPPPP ...` header) when present and prefer strict columns-only parsing for that file to eliminate ambiguity.
- Add unit tests for `parseKOFRow` covering: well-formed column rows, whitespace-separated rows, rows with missing elevation, and intentionally malformed rows. This will prevent regressions.
- Improve warnings to include the offending raw line and parsed tokens for easier debugging of malformed rows.
- Consider supporting per-file parsing mode metadata (e.g., `mode: 'columns' | 'tokens'`) and allow the user to override it for edge-case files.

- See `TODO.md` in the project root for a prioritized list of missing KOF codes, parser improvements and suggested implementation steps.

These notes are intentionally concise and actionable for Copilot-style automation and for maintainers scanning the repo.
