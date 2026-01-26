#!/usr/bin/env groovy
/**
 * Capacinator CI/CD Pipeline Stub
 *
 * This minimal stub loads the actual pipeline definition from the jenkins-lib repository.
 * Keeping the real Jenkinsfile in jenkins-lib avoids chicken-and-egg problems with protected branches.
 *
 * Architecture:
 *   - This stub: Lives in main Capacinator repo (rarely changes)
 *   - Real pipeline: Lives in capacinator-jenkins-lib repo (frequently updated)
 *   - Jenkins scans: Main repo branches, finds this stub, loads real pipeline from jenkins-lib
 *
 * Pipeline definition: https://github.com/steiner385/capacinator-jenkins-lib
 */

// Load the shared library and execute the real pipeline
library identifier: 'capacinator-lib@main',
    retriever: modernSCM([
        $class: 'GitSCMSource',
        remote: 'https://github.com/steiner385/capacinator-jenkins-lib.git',
        credentialsId: 'github-credentials'
    ])

// Execute the real pipeline from jenkins-lib
capacinatorMultibranchPipeline()
