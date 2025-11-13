package com.backend.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.backend.model.Folder;
import com.backend.model.Resource;
import com.backend.model.User;
import com.backend.repository.FolderRepository;
import com.backend.repository.ResourceRepository;

@Service
public class ResourceService {
    private final ResourceRepository resourceRepository;
    private final FolderRepository folderRepository;
    private final com.backend.repository.ResourceClassroomRepository resourceClassroomRepository;
    private static final Logger log = LoggerFactory.getLogger(ResourceService.class);

    public ResourceService(ResourceRepository resourceRepository, FolderRepository folderRepository, com.backend.repository.ResourceClassroomRepository resourceClassroomRepository) {
        this.resourceRepository = resourceRepository;
        this.folderRepository = folderRepository;
        this.resourceClassroomRepository = resourceClassroomRepository;
    }

    public Resource saveResourceMetadata(String name, String storagePath, String mimeType, Long size, String folderId, String classroomId, User user) {
        Resource r = new Resource();
        r.setName(name);
        r.setStoragePath(storagePath);
        r.setMimeType(mimeType);
        r.setSize(size);
        r.setCreatedAt(LocalDateTime.now());
        if (folderId != null) {
            Optional<Folder> f = folderRepository.findById(folderId);
            f.ifPresent(r::setFolder);
        }
        r.setUploadedBy(user);
        Resource saved = resourceRepository.save(r);
        // if classroomId provided, create link
        if (classroomId != null && !classroomId.isBlank()) {
            try {
                com.backend.model.Classroom c = new com.backend.model.Classroom();
                c.setId(classroomId);
                com.backend.model.ResourceClassroom link = new com.backend.model.ResourceClassroom();
                link.setResource(saved);
                link.setClassroom(c);
                resourceClassroomRepository.save(link);
            } catch (Exception ex) {
                log.warn("Failed to create ResourceClassroom link: {}", ex.getMessage());
            }
        }
        return saved;
    }

    public java.util.List<Resource> listByClassroom(String classroomId) {
        if (classroomId == null || classroomId.isBlank()) return java.util.List.of();
        try {
            java.util.List<com.backend.model.ResourceClassroom> links = resourceClassroomRepository.findAllByClassroom_Id(classroomId);
            return links.stream().map(l -> l.getResource()).toList();
        } catch (Exception ex) {
            log.warn("Failed to list resources for classroom {}: {}", classroomId, ex.getMessage());
            return java.util.List.of();
        }
    }

    public List<Resource> listByFolder(String folderId) {
        if (folderId == null) return resourceRepository.findAll();
        Optional<Folder> f = folderRepository.findById(folderId);
        return f.map(resourceRepository::findAllByFolder).orElseGet(List::of);
    }
    
    public Optional<Resource> findById(String id) {
        return resourceRepository.findById(id);
    }

    public boolean deleteResource(String id) {
        var opt = resourceRepository.findById(id);
        if (opt.isEmpty()) return false;
        Resource r = opt.get();
        // delete file from disk
        try {
            java.nio.file.Path p = java.nio.file.Paths.get(r.getStoragePath());
            if (java.nio.file.Files.exists(p)) java.nio.file.Files.delete(p);
        } catch (java.io.IOException e) {
            // log and continue to delete DB record
            log.warn("Failed to delete file on disk: {}", e.getMessage());
        }
        resourceRepository.delete(r);
        return true;
    }

    public boolean deleteFolder(String id) {
        var opt = folderRepository.findById(id);
        if (opt.isEmpty()) return false;
        Folder folder = opt.get();
        // prevent deletion if folder has child resources or child folders
        var resources = resourceRepository.findAllByFolder(folder);
        boolean hasResources = resources != null && !resources.isEmpty();
        boolean hasChildFolders = folderRepository.findAll().stream().anyMatch(f -> f.getParent() != null && f.getParent().getId().equals(id));
        if (hasResources || hasChildFolders) return false;
        folderRepository.delete(folder);
        return true;
    }

    public Folder createFolder(String name, String parentId, User user) {
        Folder folder = new Folder();
        folder.setName(name);
        folder.setCreateAt(LocalDateTime.now());
        folder.setUser(user);
        if (parentId != null) {
            folderRepository.findById(parentId).ifPresent(folder::setParent);
        }
        return folderRepository.save(folder);
    }

    public java.util.List<Folder> listFoldersForUser(User user) {
        if (user == null) return java.util.List.of();
        return folderRepository.findAll().stream().filter(f -> f.getUser() != null && f.getUser().getId().equals(user.getId())).toList();
    }
}
