import React, { useEffect, useState } from 'react';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { Widget } from '@lumino/widgets';

import { ThemeProvider } from '@mui/material/styles';
import {
  Box,
  InputLabel,
  MenuItem,
  FormControl,
  Select,
  SelectChangeEvent,
  Stack,
  Button
} from '@mui/material';
import { ExpandableTextField } from './expandable-text-field';

import { insertOutput } from '../inserter';
import { GaiService } from '../handler';
import { getJupyterLabTheme } from '../theme-provider';

/**
 * Map of human-readable descriptions per insertion mode.
 */
const TASK_DESCS: Record<string, string> = {
  above: 'GAI output will be inserted above the selected text',
  replace: 'GAI output will replace the selected text',
  below: 'GAI output will be inserted below the selected text',
  'above-in-cells': 'GAI output will be inserted above in new notebook cells',
  'below-in-cells': 'GAI output will be inserted below in new notebook cells'
};

export interface IOpenTaskDialogProps {
  selectedText: string;
  app: JupyterFrontEnd;
  editorWidget: Widget;
  closeDialog: () => unknown;
}

export function OpenTaskDialog(props: IOpenTaskDialogProps): JSX.Element {
  // response from ListTasks endpoint
  const [taskList, setTaskList] = useState<GaiService.ListTasksEntry[]>([]);
  // ID of the selected task, set on selection
  const [taskId, setTaskId] = useState<string>('');
  // response from DescribeTask endpoint, called after selection
  const [taskDesc, setTaskDesc] = useState<GaiService.DescribeTaskResponse>();
  const [loading, setLoading] = useState<boolean>(false);

  const onSubmitClick = async () => {
    setLoading(true);

    try {
      const request: GaiService.IPromptRequest = {
        task_id: taskId,
        prompt_variables: {
          body: props.selectedText
        }
      };
      const response = await GaiService.sendPrompt(request);
      insertOutput(props.app, {
        widget: props.editorWidget,
        request,
        response
      });
      props.closeDialog();
      return true;
    } catch (e: unknown) {
      alert('**Failed** with error:\n```\n' + (e as Error).message + '\n```');
      setLoading(false);
      return false;
    }
  };

  /**
   * Effect: call ListTasks endpoint on initial render.
   */
  useEffect(() => {
    async function listTasks() {
      const listTasksResponse = await GaiService.listTasks();
      setTaskList(listTasksResponse.tasks);
      if (!listTasksResponse.tasks.length) {
        console.error('No tasks returned via the backend');
        return;
      }
      const taskId = listTasksResponse.tasks[0].id;
      setTaskId(taskId);
      const describeTaskResponse = await GaiService.describeTask(taskId);
      setTaskDesc(describeTaskResponse);
    }
    listTasks();
  }, []);

  const handleChange = async (event: SelectChangeEvent) => {
    setTaskId(event.target.value);
    const describeTaskResponse = await GaiService.describeTask(
      event.target.value
    );
    setTaskDesc(describeTaskResponse);
  };

  const taskDescription =
    taskDesc?.insertion_mode && taskDesc.insertion_mode in TASK_DESCS
      ? TASK_DESCS[taskDesc.insertion_mode]
      : '';

  return (
    <ThemeProvider theme={getJupyterLabTheme()}>
      <Box padding={1} width={'40em'}>
        <Stack spacing={4}>
          <FormControl fullWidth>
            <InputLabel id="prompt-type-select-label">Prompt type</InputLabel>
            <Select
              labelId="prompt-type-select-label"
              id="prompt-type-select"
              value={taskId}
              onChange={handleChange}
              label="Prompt type"
              MenuProps={{
                style: { zIndex: 20000 }
              }}
              autoFocus
            >
              {taskList.map(task => (
                <MenuItem key={task.id} value={task.id}>
                  {task.name}
                </MenuItem>
              ))}
            </Select>
            <Box pt={4} width={'40em'}>
              <Stack spacing={4}>
                <ExpandableTextField
                  label="Prompt template"
                  text={taskDesc?.prompt_template}
                />
                {taskDescription && (
                  <ExpandableTextField
                    label="Task description"
                    text={taskDescription}
                  />
                )}
              </Stack>
            </Box>
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button variant="outlined" onClick={props.closeDialog}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={onSubmitClick}
                disabled={!!loading || taskId === ''}
              >
                {loading ? 'Submitting…' : 'Submit'}
              </Button>
            </Stack>
          </FormControl>
        </Stack>
      </Box>
    </ThemeProvider>
  );
}
