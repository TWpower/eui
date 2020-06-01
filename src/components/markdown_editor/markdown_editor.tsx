/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, {
  createElement,
  FunctionComponent,
  HTMLAttributes,
  useEffect,
  useMemo,
  useState,
} from 'react';
import unified, { PluggableList, Processor } from 'unified';
import classNames from 'classnames';
// @ts-ignore
import emoji from 'remark-emoji';
import markdown from 'remark-parse';
// @ts-ignore
import remark2rehype from 'remark-rehype';
// @ts-ignore
import highlight from 'remark-highlight.js';
// @ts-ignore
import rehype2react from 'rehype-react';

import { CommonProps } from '../common';
import MarkdownActions, { insertText } from './markdown_actions';
import { EuiMarkdownEditorToolbar } from './markdown_editor_toolbar';
import { EuiMarkdownEditorTextArea } from './markdown_editor_text_area';
import { EuiMarkdownFormat } from './markdown_format';
import { EuiMarkdownEditorDropZone } from './markdown_editor_drop_zone';
import { htmlIdGenerator } from '../../services/accessibility';
import { EuiLink } from '../link';
import { EuiCodeBlock } from '../code';
import { MARKDOWN_MODE, MODE_EDITING, MODE_VIEWING } from './markdown_modes';
import { EuiMarkdownEditorUiPlugin } from './markdown_types';
import { EuiOverlayMask } from '../overlay_mask';
import { EuiModal } from '../modal';
import { ContextShape, EuiMarkdownContext } from './markdown_context';

export const defaultParsingPlugins: PluggableList = [
  [markdown, {}],
  [highlight, {}],
  [emoji, { emoticon: true }],
];

export const defaultProcessingPlugins: PluggableList = [
  [
    remark2rehype,
    {
      allowDangerousHtml: true,
      handlers: {},
    },
  ],
  [
    rehype2react,
    {
      createElement: createElement,
      components: {
        a: EuiLink,
        code: (props: any) =>
          // if has classNames is a codeBlock using highlight js
          props.className ? (
            <EuiCodeBlock {...props} />
          ) : (
            <code className="euiMarkdownFormat__code" {...props} />
          ),
      },
    },
  ],
];

export type EuiMarkdownEditorProps = HTMLAttributes<HTMLDivElement> &
  CommonProps & {
    /** A unique ID to attach to the textarea. If one isn't provided, a random one
     * will be generated */
    editorId?: string;

    /** A markdown content */
    value: string;

    /** Callback function when markdown content is modified */
    onChange: (value: string) => void;

    /** The height of the content/preview area */
    height?: number;

    /** array of unified plugins to parse content into an AST */
    parsingPluginList?: PluggableList;

    /** array of unified plugins to convert the AST into a ReactNode */
    processingPluginList?: PluggableList;

    uiPlugins?: EuiMarkdownEditorUiPlugin[];
  };

export const EuiMarkdownEditor: FunctionComponent<EuiMarkdownEditorProps> = ({
  className,
  editorId: _editorId,
  value,
  onChange,
  height = 150,
  parsingPluginList = defaultParsingPlugins,
  processingPluginList = defaultProcessingPlugins,
  uiPlugins = [],
  ...rest
}) => {
  const [viewMode, setViewMode] = useState<MARKDOWN_MODE>(MODE_EDITING);
  const editorId = useMemo(() => _editorId || htmlIdGenerator()(), [_editorId]);

  const [pluginEditorPlugin, setPluginEditorPlugin] = useState<
    EuiMarkdownEditorUiPlugin | undefined
  >(undefined);

  const markdownActions = useMemo(
    () => new MarkdownActions(editorId, uiPlugins),
    // uiPlugins _is_ accounted for
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editorId, uiPlugins.map(({ name }) => name).join(',')]
  );

  const classes = classNames('euiMarkdownEditor', className);

  const parser = useMemo(() => {
    const Compiler = (tree: any) => {
      return tree;
    };

    function identityCompiler(this: Processor) {
      this.Compiler = Compiler;
    }
    return unified()
      .use(parsingPluginList)
      .use(identityCompiler);
  }, [parsingPluginList]);

  const parsed = useMemo(() => parser.processSync(value), [parser, value]);

  const processor = useMemo(
    () =>
      unified()
        .use(parsingPluginList)
        .use(processingPluginList),
    [parsingPluginList, processingPluginList]
  );

  const isPreviewing = viewMode === MODE_VIEWING;

  const contextValue = useMemo<ContextShape>(
    () => ({
      openPluginEditor: (plugin: EuiMarkdownEditorUiPlugin) =>
        setPluginEditorPlugin(() => plugin),
      replaceNode: (position, next) => {
        const leading = value.substr(0, position.start.offset);
        const trailing = value.substr(position.end.offset);
        onChange(`${leading}${next}${trailing}`);
      },
    }),
    [value, onChange]
  );

  const [selectedNode, setSelectedNode] = useState();

  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(
    null
  );
  useEffect(() => {
    if (textareaRef == null) return;

    const getCursorNode = () => {
      const { selectionStart } = textareaRef;

      let node: any = parsed.contents;

      outer: while (true) {
        if (node.children) {
          for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (
              child.position.start.offset < selectionStart &&
              selectionStart < child.position.end.offset
            ) {
              if (child.type === 'text') break outer; // don't dive into `text` nodes
              node = child;
              continue outer;
            }
          }
        }
        break;
      }

      setSelectedNode(node);
    };

    textareaRef.addEventListener('keyup', getCursorNode);
    textareaRef.addEventListener('mouseup', getCursorNode);

    return () => {
      textareaRef.removeEventListener('keyup', getCursorNode);
      textareaRef.removeEventListener('mouseup', getCursorNode);
    };
  }, [textareaRef, parsed]);

  return (
    <EuiMarkdownContext.Provider value={contextValue}>
      <div className={classes} {...rest}>
        <EuiMarkdownEditorToolbar
          selectedNode={selectedNode}
          markdownActions={markdownActions}
          onClickPreview={() =>
            setViewMode(isPreviewing ? MODE_EDITING : MODE_VIEWING)
          }
          viewMode={viewMode}
          uiPlugins={uiPlugins}
        />

        {isPreviewing ? (
          <div
            className="euiMarkdownEditor__preview"
            style={{ height: `${height}px` }}>
            <EuiMarkdownFormat processor={processor}>{value}</EuiMarkdownFormat>
          </div>
        ) : (
          <>
            <EuiMarkdownEditorDropZone>
              <EuiMarkdownEditorTextArea
                ref={setTextareaRef}
                height={height}
                id={editorId}
                onChange={e => onChange(e.target.value)}
                value={value}
              />
            </EuiMarkdownEditorDropZone>
            {textareaRef && pluginEditorPlugin && (
              <EuiOverlayMask>
                <EuiModal onClose={() => setPluginEditorPlugin(undefined)}>
                  {createElement(pluginEditorPlugin.editor!, {
                    node:
                      selectedNode &&
                      selectedNode.type === pluginEditorPlugin.name
                        ? selectedNode
                        : null,
                    onCancel: () => setPluginEditorPlugin(undefined),
                    onSave: markdown => {
                      if (
                        selectedNode &&
                        selectedNode.type === pluginEditorPlugin.name
                      ) {
                        textareaRef.setSelectionRange(
                          selectedNode.position.start.offset,
                          selectedNode.position.end.offset
                        );
                      }
                      insertText(textareaRef, {
                        text: markdown,
                        selectionStart: undefined,
                        selectionEnd: undefined,
                      });
                      setPluginEditorPlugin(undefined);
                    },
                  })}
                </EuiModal>
              </EuiOverlayMask>
            )}
          </>
        )}
      </div>
    </EuiMarkdownContext.Provider>
  );
};
