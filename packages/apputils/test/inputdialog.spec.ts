// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { InputDialog } from '@jupyterlab/apputils';
import {
  acceptDialog,
  dismissDialog,
  waitForDialog
} from '@jupyterlab/testing';

describe('@jupyterlab/apputils', () => {
  describe('InputDialog', () => {
    describe('getBoolean()', () => {
      it('should accept at least the title argument', async () => {
        const dialog = InputDialog.getBoolean({
          title: 'Check or not'
        });

        await dismissDialog();
        expect((await dialog).button.accept).toBe(false);
      });

      it('should be false by default', async () => {
        const dialog = InputDialog.getBoolean({
          title: 'Check or not'
        });

        await acceptDialog();

        const result = await dialog;

        expect(result.button.accept).toBe(true);
        expect(result.value).toBe(false);
      });

      it('should accept options', async () => {
        const dialog = InputDialog.getBoolean({
          title: 'Check or not',
          value: true
        });

        await acceptDialog();

        const result = await dialog;

        expect(result.button.accept).toBe(true);
        expect(result.value).toBe(true);
      });

      it('should be editable', async () => {
        const node = document.createElement('div');

        document.body.appendChild(node);

        const prompt = InputDialog.getBoolean({
          title: 'Check or not',
          host: node
        });

        await waitForDialog(node);
        const body = node.getElementsByClassName('jp-Input-Dialog').item(0)!;
        const input = body.getElementsByTagName('input').item(0)!;
        input.checked = true;

        await acceptDialog();

        const result = await prompt;

        expect(result.button.accept).toBe(true);
        expect(result.value).toBe(true);
        document.body.removeChild(node);
      });
    });

    describe('getItem()', () => {
      it('should accept at least two arguments', async () => {
        const dialog = InputDialog.getItem({
          title: 'list',
          items: ['item1']
        });

        await dismissDialog();
        expect((await dialog).button.accept).toBe(false);
      });

      it('should be the first item by default', async () => {
        const dialog = InputDialog.getItem({
          items: ['item1', 'item2'],
          title: 'Pick a choice'
        });

        await acceptDialog();

        const result = await dialog;

        expect(result.button.accept).toBe(true);
        expect(result.value).toBe('item1');
      });

      it('should accept options', async () => {
        const dialog = InputDialog.getItem({
          label: 'list',
          items: ['item1', 'item2'],
          current: 1,
          editable: false,
          title: 'Pick a choice',
          placeholder: 'item'
        });

        await acceptDialog();

        const result = await dialog;

        expect(result.button.accept).toBe(true);
        expect(result.value).toBe('item2');
      });

      it('should be editable', async () => {
        const node = document.createElement('div');

        document.body.appendChild(node);

        const prompt = InputDialog.getItem({
          label: 'list',
          items: ['item1', 'item2'],
          title: 'Pick a choice',
          placeholder: 'item',
          editable: true,
          host: node
        });

        await waitForDialog(node);
        const body = node.getElementsByClassName('jp-Input-Dialog').item(0)!;
        const input = body.getElementsByTagName('input').item(0)!;
        input.value = 'item3';

        await acceptDialog();

        const result = await prompt;

        expect(result.button.accept).toBe(true);
        expect(result.value).toBe('item3');
        document.body.removeChild(node);
      });
    });

    describe('getMultipleItems()', () => {
      it('should accept at least two arguments', async () => {
        const dialog = InputDialog.getMultipleItems({
          title: 'list',
          items: ['item1']
        });

        await dismissDialog();
        expect((await dialog).button.accept).toBe(false);
      });

      it('should return empty list if none is selected', async () => {
        const dialog = InputDialog.getMultipleItems({
          items: ['item1', 'item2'],
          title: 'Pick a choice'
        });

        await acceptDialog();

        const result = await dialog;

        expect(result.button.accept).toBe(true);
        expect(result.value).toStrictEqual([]);
      });

      it('should accept option "defaults"', async () => {
        const dialog = InputDialog.getMultipleItems({
          label: 'list',
          items: ['item1', 'item2', 'item3'],
          defaults: ['item1', 'item3'],
          title: 'Pick a choice'
        });

        await acceptDialog();

        const result = await dialog;

        expect(result.button.accept).toBe(true);
        expect(result.value).toStrictEqual(['item1', 'item3']);
      });
    });

    describe('getText()', () => {
      it('should accept at least one argument', async () => {
        const dialog = InputDialog.getText({
          title: 'text'
        });

        await dismissDialog();
        expect((await dialog).button.accept).toBe(false);
      });

      it('should be an empty string by default', async () => {
        const dialog = InputDialog.getText({
          title: 'Give a text'
        });

        await acceptDialog();

        const result = await dialog;

        expect(result.button.accept).toBe(true);
        expect(result.value).toBe('');
      });

      it('should accept options', async () => {
        const dialog = InputDialog.getText({
          label: 'text',
          title: 'Give a text',
          placeholder: 'your text',
          text: 'answer'
        });

        await acceptDialog();

        const result = await dialog;

        expect(result.button.accept).toBe(true);
        expect(result.value).toBe('answer');
      });

      it('should be editable', async () => {
        const node = document.createElement('div');

        document.body.appendChild(node);

        const prompt = InputDialog.getText({
          title: 'text',
          host: node
        });

        await waitForDialog(node);
        const body = node.getElementsByClassName('jp-Input-Dialog').item(0)!;
        const input = body.getElementsByTagName('input').item(0)!;
        input.value = 'my answer';

        await acceptDialog();

        const result = await prompt;

        expect(result.button.accept).toBe(true);
        expect(result.value).toBe('my answer');
        document.body.removeChild(node);
      });

      it('should prevent accepting when pattern does not match', async () => {
        const node = document.createElement('div');
        document.body.appendChild(node);

        const dialog = InputDialog.getText({
          title: 'Give me letters',
          pattern: '[a-z]+',
          host: node
        });

        await waitForDialog(node);
        const input = node.querySelector(
          'input[type="text"]'
        ) as HTMLInputElement;

        input.value = '123';
        input.dispatchEvent(new Event('input'));

        const acceptButton = node.querySelector(
          'button.jp-mod-accept'
        ) as HTMLButtonElement;
        const dismissButton = node.querySelector(
          'button.jp-mod-reject'
        ) as HTMLButtonElement;
        expect(acceptButton.disabled).toBe(true);
        expect(dismissButton.disabled).toBe(false);

        await dismissDialog();
        const result = await dialog;
        expect(result.button.accept).toBe(false);
      });

      it('should allow accepting when pattern matches', async () => {
        const node = document.createElement('div');
        document.body.appendChild(node);

        const dialog = InputDialog.getText({
          title: 'Give me letters',
          pattern: '[a-z]+',
          host: node
        });

        await waitForDialog(node);
        const input = node.querySelector(
          'input[type="text"]'
        ) as HTMLInputElement;

        input.value = 'abc';
        input.dispatchEvent(new Event('input'));

        const acceptButton = node.querySelector(
          'button.jp-mod-accept'
        ) as HTMLButtonElement;
        const dismissButton = node.querySelector(
          'button.jp-mod-reject'
        ) as HTMLButtonElement;
        expect(acceptButton.disabled).toBe(false);
        expect(dismissButton.disabled).toBe(false);

        await acceptDialog();
        const result = await dialog;
        expect(result.button.accept).toBe(true);
        expect(result.value).toBe('abc');
      });
    });

    describe('getNumber()', () => {
      it('should accept at least one argument', async () => {
        const dialog = InputDialog.getNumber({
          title: 'number'
        });

        await dismissDialog();
        expect((await dialog).button.accept).toBe(false);
      });

      it('should be 0 by default', async () => {
        const dialog = InputDialog.getNumber({
          title: 'Pick a number'
        });

        await acceptDialog();

        const result = await dialog;

        expect(result.button.accept).toBe(true);
        expect(result.value).toBe(0);
      });

      it('should accept options', async () => {
        const dialog = InputDialog.getNumber({
          label: 'number',
          title: 'Pick a number',
          value: 10
        });

        await acceptDialog();

        const result = await dialog;

        expect(result.button.accept).toBe(true);
        expect(result.value).toBe(10);
      });

      it('should be editable', async () => {
        const node = document.createElement('div');

        document.body.appendChild(node);

        const prompt = InputDialog.getNumber({
          label: 'text',
          title: 'Pick a number',
          host: node
        });

        await waitForDialog(node);
        const body = node.getElementsByClassName('jp-Input-Dialog').item(0)!;
        const input = body.getElementsByTagName('input').item(0)!;
        input.value = '25';

        await acceptDialog();

        const result = await prompt;

        expect(result.button.accept).toBe(true);
        expect(result.value).toBe(25);
        document.body.removeChild(node);
      });

      it('should return NaN if empty', async () => {
        const node = document.createElement('div');

        document.body.appendChild(node);

        const prompt = InputDialog.getNumber({
          label: 'text',
          title: 'Pick a number',
          host: node
        });

        await waitForDialog(node);
        const body = node.getElementsByClassName('jp-Input-Dialog').item(0)!;
        const input = body.getElementsByTagName('input').item(0)!;
        input.value = '';

        await acceptDialog();

        const result = await prompt;

        expect(result.button.accept).toBe(true);
        expect(result.value).toBeNaN();
        document.body.removeChild(node);
      });
    });
  });
});
