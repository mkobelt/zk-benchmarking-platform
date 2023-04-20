import benchexec.tools.template as template

class Tool(template.BaseTool2):
    def name(self):
        return "zokrates"

    def executable(self, tool_locator):
        return tool_locator.find_executable("zokrates")

    def version(self, executable):
        versionString = self._version_from_tool(executable)
        return versionString.split(" ")[1]

    def environment(self, executable):
        return {
            "newEnv": {
                "ZOKRATES_STDLIB": "/home/max/.zokrates/stdlib/"
            },
        }
    
    def cmdline(self, executable, options, task, rlimits):
        return [executable, *options, "--input", *task.input_files_or_identifier]
