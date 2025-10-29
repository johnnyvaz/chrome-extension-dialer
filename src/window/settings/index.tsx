import { Box, Button, Center, Text, Tabs, TabList, Tab, TabPanels, TabPanel } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { getSettings } from "src/storage";
import { IAppSettings } from "src/common/types";
import AccountForm from "./accountForm";
import AnimateOnShow from "src/components/animate";
import { AccordionList } from "src/window/settings/accordionList";
import AuditoriaConfigComponent from "src/components/auditoria-config";

const MAX_NUM_OF_ACCOUNTS = 5;

export const Settings = () => {
  const [showForm, setShowForm] = useState(false);
  const [showFormInAccordion, setShowFormInAccordion] = useState(false);
  const [allSettings, setAllSettings] = useState<IAppSettings[]>([]);

  useEffect(
    function () {
      loadSettings();
    },
    [showForm]
  );

  function handleOpenForm() {
    setShowForm(true);
  }
  function handleCloseForm() {
    setShowForm(false);
  }
  function handleOpenFormInAccordion() {
    setShowFormInAccordion(true);
  }
  function handleCloseFormInAccordion() {
    setShowFormInAccordion(false);
  }

  const loadSettings = function () {
    setAllSettings(getSettings());
  };

  const btnIsDisabled = allSettings.length >= MAX_NUM_OF_ACCOUNTS;

  return (
    <div>
      <Tabs isFitted colorScheme="jambonz">
        <TabList mb="1em" gap={1}>
          <Tab>Accounts</Tab>
          <Tab>Auditoria</Tab>
        </TabList>

        <TabPanels mt={1}>
          <TabPanel p={0}>
            <Box>
              <AccordionList
                handleOpenFormInAccordion={handleOpenFormInAccordion}
                handleCloseFormInAccordion={handleCloseFormInAccordion}
                allSettings={allSettings}
                reload={loadSettings}
                isNewFormOpen={showForm}
                handleCloseNewForm={handleCloseForm}
              />
            </Box>
            {!showForm && !showFormInAccordion && (
              <Button
                marginY={"3"}
                colorScheme="jambonz"
                w="full"
                onClick={handleOpenForm}
                isDisabled={btnIsDisabled}
              >
                Add Account
              </Button>
            )}

            {showForm && (
              <AnimateOnShow>
                <AccountForm closeForm={handleCloseForm} />
              </AnimateOnShow>
            )}

            <Center marginBottom={"2.5"} flexDirection={"column"}>
              <Text>
                {allSettings.length} of {MAX_NUM_OF_ACCOUNTS}{" "}
              </Text>
              {btnIsDisabled && <Text>Limit has been reached</Text>}
            </Center>
          </TabPanel>
          {/* <TabPanel p={0}>
            <AuditoriaConfigComponent />
          </TabPanel> */}
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default Settings;
