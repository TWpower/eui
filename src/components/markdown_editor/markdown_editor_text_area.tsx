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

import React, { TextareaHTMLAttributes, forwardRef } from 'react';
import { CommonProps } from '../common';

export type EuiMarkdownEditorTextAreaProps = TextareaHTMLAttributes<
  HTMLTextAreaElement
> &
  CommonProps & {
    isInvalid?: boolean;
    fullWidth?: boolean;
    compressed?: boolean;

    /**
     * Which direction, if at all, should the textarea resize
     */
    resize?: keyof typeof resizeToClassNameMap;

    height: number;
  };

const resizeToClassNameMap = {
  vertical: 'euiTextArea--resizeVertical',
  horizontal: 'euiTextArea--resizeHorizontal',
  both: 'euiTextArea--resizeBoth',
  none: 'euiTextArea--resizeNone',
};

export const RESIZE = Object.keys(resizeToClassNameMap);

export const EuiMarkdownEditorTextArea = forwardRef<
  HTMLTextAreaElement,
  EuiMarkdownEditorTextAreaProps
>(
  (
    {
      children,
      className,
      compressed,
      id,
      isInvalid,
      name,
      placeholder,
      rows,
      height,
      ...rest
    },
    ref
  ) => {
    const dropZoneButtonHeight = 32;

    return (
      <textarea
        ref={ref}
        style={{ height: `calc(${height - dropZoneButtonHeight}px` }}
        className="euiMarkdownEditor__textArea"
        {...rest}
        rows={6}
        name={name}
        id={id}
        placeholder={placeholder}>
        {children}
      </textarea>
    );
  }
);

EuiMarkdownEditorTextArea.displayName = 'EuiMarkdownEditorTextArea';
