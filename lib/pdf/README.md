# PDF Parsing System

This module provides a unified interface for multiple PDF parsing providers.

## Supported Providers

- `unpdf` (built-in)
- `MinerU` (self-hosted/local deployment)

## Purpose

- Extract text from PDF files
- Extract images and metadata
- Provide data for course generation pipelines

## Notes

- Configure provider settings via environment variables and app settings.
- Use the debug page to test parser behavior during development.
