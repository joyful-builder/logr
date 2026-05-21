use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufRead, BufReader};

use crate::commands::file::{decode_content, detect_level, extract_timestamp, LogLine};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub line: LogLine,
    pub match_start: usize,
    pub match_end: usize,
}

#[tauri::command]
pub async fn search_file(
    path: String,
    query: String,
    is_regex: bool,
    case_sensitive: bool,
    encoding: String,
) -> Result<Vec<SearchResult>, String> {
    if query.is_empty() {
        return Ok(vec![]);
    }

    let file = File::open(&path).map_err(|e| format!("파일 열기 실패: {e}"))?;
    let reader = BufReader::new(file);

    let pattern = if is_regex {
        let p = if case_sensitive {
            query.clone()
        } else {
            format!("(?i){query}")
        };
        Regex::new(&p).map_err(|e| format!("정규식 오류: {e}"))?
    } else {
        let escaped = regex::escape(&query);
        let p = if case_sensitive {
            escaped
        } else {
            format!("(?i){escaped}")
        };
        Regex::new(&p).map_err(|e| e.to_string())?
    };

    let mut results = Vec::new();

    for (index, raw_line) in reader.split(b'\n').enumerate() {
        let raw_bytes = raw_line.map_err(|e| e.to_string())?;
        let content = decode_content(&raw_bytes, &encoding);

        if let Some(m) = pattern.find(&content) {
            let match_start = m.start();
            let match_end = m.end();
            let level = detect_level(&content);
            let timestamp = extract_timestamp(&content);
            results.push(SearchResult {
                line: LogLine {
                    index,
                    raw: content.clone(),
                    content,
                    level,
                    timestamp,
                },
                match_start,
                match_end,
            });
        }
    }

    Ok(results)
}
