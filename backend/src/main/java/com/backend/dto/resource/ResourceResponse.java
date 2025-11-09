package com.backend.dto.resource;

import java.time.LocalDateTime;

import com.backend.model.Resource;

public class ResourceResponse {
	private String id;
	private String name;
	private String mimeType;
	private Long size;
	private LocalDateTime createdAt;
	private String folderId;

	public ResourceResponse() {}

	public ResourceResponse(String id, String name, String mimeType, Long size, LocalDateTime createdAt, String folderId) {
		this.id = id;
		this.name = name;
		this.mimeType = mimeType;
		this.size = size;
		this.createdAt = createdAt;
		this.folderId = folderId;
	}

	public static ResourceResponse from(Resource r) {
		if (r == null) return null;
		String folderId = r.getFolder() != null ? r.getFolder().getId() : null;
		return new ResourceResponse(r.getId(), r.getName(), r.getMimeType(), r.getSize(), r.getCreatedAt(), folderId);
	}

	// getters & setters
	public String getId() { return id; }
	public void setId(String id) { this.id = id; }
	public String getName() { return name; }
	public void setName(String name) { this.name = name; }
	public String getMimeType() { return mimeType; }
	public void setMimeType(String mimeType) { this.mimeType = mimeType; }
	public Long getSize() { return size; }
	public void setSize(Long size) { this.size = size; }
	public LocalDateTime getCreatedAt() { return createdAt; }
	public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
	public String getFolderId() { return folderId; }
	public void setFolderId(String folderId) { this.folderId = folderId; }
}
